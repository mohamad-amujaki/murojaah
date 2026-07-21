interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_AUTH_LIMITS: Record<string, RateLimitConfig> = {
  "/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  "/api/auth/register": { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  "/api/practice/complete": { windowMs: 60 * 1000, maxRequests: 10 },
  default: { windowMs: 60 * 1000, maxRequests: 60 },
};

const inMemoryStore = new Map<string, RateLimitEntry>();

export function rateLimit(ip: string, pathname: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const config = DEFAULT_AUTH_LIMITS[pathname] ?? DEFAULT_AUTH_LIMITS.default;
  const key = `${ip}:${pathname}`;
  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
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
      "x-ratelimit-limit": String(5),
      "x-ratelimit-retry-after": String(seconds),
    },
  });
}
