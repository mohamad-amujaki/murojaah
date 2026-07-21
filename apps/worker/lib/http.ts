import type { Pool } from "mysql2/promise";
import type { PublicUser } from "@murojaah/shared";
import type { RateLimitStore } from "./rate-limit";

export interface Env {
  DB: Pool;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NODE_ENV?: string;
  /** Injected by server.mjs when REDIS_URL is configured (VPS); absent elsewhere. */
  RATE_LIMIT_STORE?: RateLimitStore;
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
