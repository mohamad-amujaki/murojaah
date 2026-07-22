import { eq, sql } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { credentials, oauthAccounts, users, sessions } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import { generateSessionToken, sessionExpiry, setSessionCookieHeader } from "../lib/auth";
import { insertReturning } from "../lib/db-helpers";

const STATE_COOKIE = "murojaah_oauth_state";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";

interface GoogleIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  aud: string;
  iss: string;
  exp: number;
}

function decodeBase64Url(s: string) {
  return JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + (4 - (s.length % 4)) % 4, "=")));
}

function decodeIdToken(idToken: string): GoogleIdTokenClaims | null {
  try { return decodeBase64Url(idToken.split(".")[1]); } catch { return null; }
}

async function verifyWithJwks(idToken: string): Promise<boolean> {
  try {
    const [rawHeader, rawPayload, rawSig] = idToken.split(".");
    if (!rawHeader || !rawPayload || !rawSig) return false;
    const { kid } = decodeBase64Url(rawHeader) as { kid?: string };
    if (!kid) return false;

    const jwksResp = await fetch(GOOGLE_JWKS_URI, { cf: { cacheTtl: 3600, cacheEverything: true } } as RequestInit);
    if (!jwksResp.ok) return false;
    const jwks = await jwksResp.json() as { keys: { kid: string; n: string; e: string; kty?: string; alg?: string }[] };
    const key = jwks.keys.find(k => k.kid === kid);
    if (!key) return false;

    const pubKey = await crypto.subtle.importKey("jwk", { kty: key.kty ?? "RSA", n: key.n, e: key.e, alg: "RS256" }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);

    const sigBytes = Uint8Array.from(atob(rawSig.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const data = new TextEncoder().encode(`${rawHeader}.${rawPayload}`);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pubKey, sigBytes, data);
  } catch {
    return false;
  }
}

export const handleGoogleStart: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/google/start" || request.method !== "GET") return null;
  if (!env.GOOGLE_CLIENT_ID) return json({ error: "Masuk dengan Google belum dikonfigurasi." }, 501, {}, "no-store");

  const state = generateSessionToken();
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID as string);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  const secure = url.protocol === "https:" ? " Secure;" : "";
  return new Response(null, {
    status: 302,
    headers: {
      location: authUrl.toString(),
      "set-cookie": `${STATE_COOKIE}=${state}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=600`,
    },
  });
};

export const handleGoogleCallback: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/google/callback" || request.method !== "GET") return null;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader.split(";").map(p => p.trim()).find(p => p.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1);
  const secure = url.protocol === "https:" ? " Secure;" : "";
  const clearStateCookie = `${STATE_COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return Response.redirect(`${url.origin}/?error=oauth_state`, 302);
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    const h = new Headers({ location: `${url.origin}/?error=oauth_unconfigured` });
    h.append("set-cookie", clearStateCookie);
    return new Response(null, { status: 302, headers: h });
  }
  if (!env.DB) {
    const h = new Headers({ location: `${url.origin}/?error=oauth_unconfigured` });
    h.append("set-cookie", clearStateCookie);
    return new Response(null, { status: 302, headers: h });
  }
  const db = getDb({ DB: env.DB });

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code!,
      client_id: env.GOOGLE_CLIENT_ID as string,
      client_secret: env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    const h = new Headers({ location: `${url.origin}/?error=oauth_exchange` });
    h.append("set-cookie", clearStateCookie);
    return new Response(null, { status: 302, headers: h });
  }
  const tokenBody = await tokenResponse.json() as { id_token?: string };
  const idToken = tokenBody.id_token;
  const claims = idToken ? decodeIdToken(idToken) : null;

  if (idToken) {
    const sigValid = await verifyWithJwks(idToken);
    if (!sigValid) {
      const h = new Headers({ location: `${url.origin}/?error=oauth_invalid` });
      h.append("set-cookie", clearStateCookie);
      return new Response(null, { status: 302, headers: h });
    }
  }

  const valid = claims
    && claims.aud === env.GOOGLE_CLIENT_ID
    && GOOGLE_ISSUERS.includes(claims.iss)
    && claims.email_verified
    && claims.email
    && claims.exp * 1000 > Date.now();
  if (!valid || !claims || !claims.email) {
    const h = new Headers({ location: `${url.origin}/?error=oauth_invalid` });
    h.append("set-cookie", clearStateCookie);
    return new Response(null, { status: 302, headers: h });
  }
  const email = claims.email;

  const [existingOauth] = await db.select().from(oauthAccounts).where(eq(oauthAccounts.providerAccountId, claims.sub)).limit(1);

  let userId: number;
  if (existingOauth) {
    userId = existingOauth.userId;
  } else {
    const [existingCredential] = await db.select().from(credentials).where(eq(credentials.email, email)).limit(1);
    if (existingCredential) {
      userId = existingCredential.userId;
    } else {
      const created = await insertReturning(db, users, { displayName: claims.name || email.split("@")[0], role: "parent" });
      userId = created.id;
    }
    await db.insert(oauthAccounts).values({ userId, provider: "google", providerAccountId: claims.sub, email }).onDuplicateKeyUpdate({ set: { id: sql`id` } });
  }

  const isNewUser = !existingOauth;
  const token = generateSessionToken();
  await db.insert(sessions).values({ token, userId, activeUserId: userId, expiresAt: sessionExpiry() });

  const redirectPath = isNewUser ? "/?role_setup=1" : "/";
  const headers = new Headers({ location: `${url.origin}${redirectPath}` });
  headers.append("set-cookie", setSessionCookieHeader(token, url));
  headers.append("set-cookie", clearStateCookie);
  return new Response(null, { status: 302, headers });
};
