// Pluggable rate limiting. The Node VPS entry (server.mjs) injects a Redis-backed
// store via env.RATE_LIMIT_STORE; anywhere without one (local dev, Cloudflare
// Workers) falls back to the in-memory store below. Worker code stays free of
// any Redis import so the bundle remains platform-agnostic.
export interface RateLimitStore {
  /** Increment the counter for `key`, starting a `windowMs` window on first hit. */
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  "/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  "/api/auth/register": { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  "/api/practice/complete": { windowMs: 60 * 1000, maxRequests: 10 },
  default: { windowMs: 60 * 1000, maxRequests: 60 },
};

const memory = new Map<string, { count: number; resetAt: number }>();

const memoryStore: RateLimitStore = {
  async hit(key, windowMs) {
    const now = Date.now();
    const entry = memory.get(key);
    if (!entry || now > entry.resetAt) {
      const fresh = { count: 1, resetAt: now + windowMs };
      memory.set(key, fresh);
      return fresh;
    }
    entry.count++;
    return entry;
  },
};

export async function rateLimit(
  env: { RATE_LIMIT_STORE?: RateLimitStore },
  ip: string,
  pathname: string,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const config = LIMITS[pathname] ?? LIMITS.default;
  const store = env.RATE_LIMIT_STORE ?? memoryStore;
  try {
    const { count, resetAt } = await store.hit(`rl:${ip}:${pathname}`, config.windowMs);
    if (count > config.maxRequests) {
      return { allowed: false, retryAfterMs: Math.max(resetAt - Date.now(), 1000) };
    }
    return { allowed: true, retryAfterMs: 0 };
  } catch {
    // Store unreachable (e.g. Redis restarting) → fail open: keeping auth
    // available beats strict limiting during an infra hiccup.
    return { allowed: true, retryAfterMs: 0 };
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function rateLimitResponse(retryAfterMs: number) {
  const seconds = Math.ceil(retryAfterMs / 1000);
  return new Response(JSON.stringify({ error: `Terlalu banyak permintaan. Coba lagi dalam ${seconds} detik.` }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(seconds),
    },
  });
}
