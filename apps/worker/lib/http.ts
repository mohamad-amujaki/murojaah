import type { Pool } from "mysql2/promise";
import type { PublicUser } from "@murojaah/shared";
import type { RateLimitStore } from "./rate-limit";

export interface Env {
  DB: Pool;
  MU_GOOGLE_CLIENT_ID?: string;
  MU_GOOGLE_CLIENT_SECRET?: string;
  NODE_ENV?: string;
  /** Injected by server.mjs when REDIS_URL is configured (VPS); absent elsewhere. */
  RATE_LIMIT_STORE?: RateLimitStore;
  MU_SMTP_HOST?: string;
  MU_SMTP_PORT?: string;
  MU_SMTP_USER?: string;
  MU_SMTP_PASS?: string;
  MU_FROM_EMAIL?: string;
  MU_FROM_NAME?: string;
  MU_APP_URL?: string;
}

export type CurrentUser = PublicUser;

export interface RequestContext {
  currentUser: CurrentUser | null;
  /** id of the account that actually logged in (may differ from currentUser.id after a profile switch) */
  loginUserId: number | null;
  sessionToken: string | null;
}

const baseSecurityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "x-xss-protection": "1; mode=block",
};

const securityHeaders = (): Record<string, string> => baseSecurityHeaders;

export const json = (data: unknown, status = 200, extraHeaders: Record<string, string> = {}, cacheControl = "no-store") =>
  Response.json(data, {
    status,
    headers: { ...securityHeaders(), "cache-control": cacheControl, ...extraHeaders },
  });

export type RouteHandler = (request: Request, url: URL, env: Env, ctx: RequestContext) => Promise<Response | null>;

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  return request.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

type ZodSafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: { message?: string }[] } };

export async function parseBody<T>(request: Request, schema: { safeParse(input: unknown): ZodSafeParseResult<T> }): Promise<T | Response> {
  const raw = await readJsonBody(request);
  if (raw === null) return json({ error: "Format data tidak valid." }, 400, {}, "no-store");
  const result = schema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue?.message ?? "Data tidak valid.";
    return json({ error: message }, 400, {}, "no-store");
  }
  return result.data;
}
