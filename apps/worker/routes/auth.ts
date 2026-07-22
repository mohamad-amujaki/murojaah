import { and, eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { credentials, parentChildren, sessions, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, readJsonBody } from "../lib/http";
import { requireAuth, requireDb } from "../lib/guards";
import {
  clearSessionCookieHeader, generateSessionToken, hashPassword,
  sessionExpiry, setSessionCookieHeader, verifyPassword,
} from "../lib/auth";
import { publicUser } from "../lib/profile";
import { getClientIp, rateLimit, rateLimitResponse } from "../lib/rate-limit";
import { insertReturning } from "../lib/db-helpers";

const REGISTERABLE_ROLES = ["student", "teacher", "parent"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_VALUES = ["L", "P"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const handleRegister: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/register" || request.method !== "POST") return null;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/auth/register");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const body = await readJsonBody(request);
  const displayName = String(body?.displayName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "");

  if (!displayName || !EMAIL_RE.test(email) || password.length < 8 || !REGISTERABLE_ROLES.includes(role as typeof REGISTERABLE_ROLES[number])) {
    return json({ error: "Data pendaftaran tidak valid. Periksa nama, email, kata sandi (min. 8 karakter), dan peran." }, 400, {}, "no-store");
  }

  const [existing] = await db.select({ id: credentials.id }).from(credentials).where(eq(credentials.email, email)).limit(1);
  if (existing) return json({ error: "Email sudah terdaftar." }, 409, {}, "no-store");

  const user = await insertReturning(db, users, { displayName, role: role as typeof REGISTERABLE_ROLES[number] });
  const passwordHash = await hashPassword(password);
  await db.insert(credentials).values({ userId: user.id, email, passwordHash });

  const token = generateSessionToken();
  const expiresAt = sessionExpiry();
  await db.insert(sessions).values({ token, userId: user.id, activeUserId: user.id, expiresAt });

  return json({ user: publicUser(user) }, 201, { "set-cookie": setSessionCookieHeader(token, url) }, "no-store");
};

export const handleLogin: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/login" || request.method !== "POST") return null;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/auth/login");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const body = await readJsonBody(request);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return json({ error: "Email dan kata sandi wajib diisi." }, 400, {}, "no-store");

  const [row] = await db.select().from(credentials).where(eq(credentials.email, email)).limit(1);
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return json({ error: "Email atau kata sandi salah." }, 401, {}, "no-store");
  }
  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user) return json({ error: "Email atau kata sandi salah." }, 401, {}, "no-store");

  const token = generateSessionToken();
  const expiresAt = sessionExpiry();
  await db.insert(sessions).values({ token, userId: user.id, activeUserId: user.id, expiresAt });

  return json({ user: publicUser(user) }, 200, { "set-cookie": setSessionCookieHeader(token, url) }, "no-store");
};

export const handleLogout: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/logout" || request.method !== "POST") return null;
  if (ctx.sessionToken && env.DB) {
    const db = getDb({ DB: env.DB });
    await db.delete(sessions).where(eq(sessions.token, ctx.sessionToken));
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookieHeader(url) }, "no-store");
};

export const handleMe: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/me" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");

  let children: ReturnType<typeof publicUser>[] = [];
  let loginUser = ctx.currentUser;
  if (ctx.loginUserId && env.DB) {
    const db = getDb({ DB: env.DB });
    const rows = await db.select().from(users).where(eq(users.managedBy, ctx.loginUserId));
    children = rows.map(publicUser);
    if (ctx.loginUserId !== ctx.currentUser.id) {
      const [row] = await db.select().from(users).where(eq(users.id, ctx.loginUserId)).limit(1);
      if (row) loginUser = publicUser(row);
    }
  }
  return json({ user: ctx.currentUser, loginUser, children, isActingAsChild: ctx.loginUserId !== ctx.currentUser.id }, 200, {}, "no-store");
};

export const handleCreateChild: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/children" || request.method !== "POST") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;
  if (user.role !== "parent" || ctx.loginUserId !== user.id) {
    return json({ error: "Hanya akun orang tua yang dapat menambah profil anak." }, 403, {}, "no-store");
  }

  const body = await readJsonBody(request);
  const displayName = String(body?.displayName ?? "").trim();
  const gender = String(body?.gender ?? "");
  const birthDate = String(body?.birthDate ?? "");
  const validBirthDate = DATE_RE.test(birthDate) && !Number.isNaN(Date.parse(birthDate)) && new Date(birthDate).getTime() <= Date.now();

  if (!displayName) return json({ error: "Nama anak wajib diisi." }, 400, {}, "no-store");
  if (!GENDER_VALUES.includes(gender as typeof GENDER_VALUES[number])) return json({ error: "Jenis kelamin wajib dipilih." }, 400, {}, "no-store");
  if (!validBirthDate) return json({ error: "Tanggal lahir tidak valid." }, 400, {}, "no-store");

  const child = await insertReturning(db, users, {
    displayName, role: "student", managedBy: user.id,
    gender: gender as typeof GENDER_VALUES[number], birthDate,
  });
  await db.insert(parentChildren).values({ parentId: user.id, childId: child.id });

  return json({ child: publicUser(child) }, 201, {}, "no-store");
};

export const handleSwitchProfile: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/switch-profile" || request.method !== "POST") return null;
  if (!ctx.currentUser || !ctx.loginUserId || !ctx.sessionToken) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const body = await readJsonBody(request);
  const targetId = Number(body?.userId);
  if (!Number.isInteger(targetId)) return json({ error: "Profil tidak valid." }, 400, {}, "no-store");

  const allowed = targetId === ctx.loginUserId
    || (await db.select({ id: users.id }).from(users).where(and(eq(users.id, targetId), eq(users.managedBy, ctx.loginUserId))).limit(1)).length > 0;
  if (!allowed) return json({ error: "Kamu tidak memiliki akses ke profil ini." }, 403, {}, "no-store");

  await db.update(sessions).set({ activeUserId: targetId }).where(eq(sessions.token, ctx.sessionToken));
  const [user] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  return json({ user: publicUser(user) }, 200, {}, "no-store");
};
