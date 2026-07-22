/**
 * Node.js entry point — runs bundled Cloudflare Worker on VPS with MySQL.
 */

import { createServer } from "node:http";
import mysql from "mysql2/promise";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT ?? "8787", 10);
const STATIC_DIR = process.env.STATIC_DIR ?? resolve(__dirname, "static");

// ——— MySQL connection pool ———
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? "3306", 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

try {
  await pool.query("SELECT 1");
  console.log(`✓ Database: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
} catch (e) {
  console.error("✘ Database error:", e.message);
  process.exit(1);
}

// ——— Auto-migrations ———
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? resolve(__dirname, "migrations");
const SEED_FILES = [resolve(__dirname, "seeds", "quran-full.mysql.sql")];

async function runSqlFile(path) {
  const text = await readFile(path, "utf8");
  const rawStatements = text.includes("--> statement-breakpoint")
    ? text.split("--> statement-breakpoint")
    : text.split("\n");
  const statements = rawStatements.map((s) => s.trim()).filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const stmt of statements) await pool.query(stmt);
}

try {
  await pool.query("CREATE TABLE IF NOT EXISTS mu__migrations (name VARCHAR(191) PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP()))");
  const [appliedRows] = await pool.query("SELECT name FROM mu__migrations");
  const applied = new Set(appliedRows.map((r) => r.name));

  if (existsSync(MIGRATIONS_DIR)) {
    for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
      if (applied.has(file)) continue;
      await runSqlFile(resolve(MIGRATIONS_DIR, file));
      await pool.query("INSERT INTO mu__migrations (name) VALUES (?)", [file]);
      console.log(`✓ Migration applied: ${file}`);
    }
  }

  for (const seedPath of SEED_FILES) {
    const name = `seed:${seedPath.split("/").pop()}`;
    if (applied.has(name) || !existsSync(seedPath)) continue;
    await runSqlFile(seedPath);
    await pool.query("INSERT INTO mu__migrations (name) VALUES (?)", [name]);
    console.log(`✓ Seed applied: ${name}`);
  }
} catch (e) {
  console.error("✘ Migration error:", e.message);
  process.exit(1);
}

// ——— Redis (optional): shared rate-limit store ———
// When REDIS_URL is set, rate-limit counters live in Redis so they survive
// container restarts and stay consistent across replicas. Without it, the
// worker's in-memory fallback is used (fine for a single container).
let redis = null;
let rateLimitStore = undefined;
if (process.env.REDIS_URL) {
  try {
    const { createClient } = await import("redis");
    redis = createClient({
      url: process.env.REDIS_URL,
      // Without this, commands queue forever while Redis is down and every
      // rate-limited request hangs; with it they reject instantly and
      // rateLimit() fails open (verified by killing Redis mid-run).
      disableOfflineQueue: true,
      socket: { reconnectStrategy: (retries) => Math.min(retries * 200, 5000) },
    });
    redis.on("error", (e) => console.error("Redis error:", e.message));
    await redis.connect();
    console.log(`✓ Redis: ${process.env.REDIS_URL}`);
    rateLimitStore = {
      async hit(key, windowMs) {
        const count = await redis.incr(key);
        if (count === 1) await redis.pExpire(key, windowMs);
        const ttl = await redis.pTTL(key);
        return { count, resetAt: Date.now() + (ttl > 0 ? ttl : windowMs) };
      },
    };
  } catch (e) {
    console.warn("⚠ Redis unavailable — rate limiting falls back to in-memory:", e.message);
    redis = null;
  }
}

// ——— Env ———
const env = {
  DB: pool,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "production",
  RATE_LIMIT_STORE: rateLimitStore,
};

// ——— Load bundled worker ———
let worker;
try {
  const workerPath = resolve(__dirname, "dist", "worker", "index.mjs");
  const mod = await import(workerPath);
  worker = mod.default;
  if (!worker || typeof worker.fetch !== "function") throw new Error("No fetch handler");
  console.log("✓ Worker handler loaded");
} catch (e) {
  console.error("✘ Failed to load worker:", e.message);
  process.exit(1);
}

// ——— MIME types ———
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

// Text-based formats compress well (often 70-80% smaller); binary formats
// (images, fonts) are already compressed and gzipping them again just burns
// CPU for no size benefit.
const COMPRESSIBLE_EXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg"]);

async function sendFile(res, acceptEncoding, filePath, ext, fileStat, cacheControl) {
  const body = await readFile(filePath);
  const headers = {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": cacheControl,
    "ETag": `"${fileStat.mtimeMs}"`,
  };
  if (COMPRESSIBLE_EXT.has(ext) && acceptEncoding.includes("br")) {
    const compressed = brotliCompressSync(body);
    headers["Content-Encoding"] = "br";
    headers["Content-Length"] = compressed.length;
    res.writeHead(200, headers);
    res.end(compressed);
  } else if (COMPRESSIBLE_EXT.has(ext) && acceptEncoding.includes("gzip")) {
    const compressed = gzipSync(body);
    headers["Content-Encoding"] = "gzip";
    headers["Content-Length"] = compressed.length;
    res.writeHead(200, headers);
    res.end(compressed);
  } else {
    headers["Content-Length"] = fileStat.size;
    res.writeHead(200, headers);
    res.end(body);
  }
}

let indexCache = null;

async function serveStatic(urlPath, acceptEncoding, res) {
  // path.resolve() treats a leading "/" as absolute and discards STATIC_DIR
  // entirely, so it must be stripped before joining; the startsWith check
  // then blocks "../" traversal outside STATIC_DIR.
  const relPath = (urlPath === "/" ? "index.html" : urlPath).replace(/^\/+/, "");
  const filePath = resolve(STATIC_DIR, relPath);
  try {
    if (!filePath.startsWith(STATIC_DIR)) throw new Error("Outside static dir");
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    const ext = "." + filePath.split(".").pop();
    // Vite fingerprints everything under /assets/ with a content hash, so those
    // can be cached forever; index.html (and anything else) must stay
    // revalidate-able or a redeploy would keep serving stale asset references.
    const cacheControl = relPath.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache";
    await sendFile(res, acceptEncoding, filePath, ext, fileStat, cacheControl);
  } catch {
    // Try index.html fallback for SPA
    try {
      const indexPath = resolve(STATIC_DIR, "index.html");
      if (!indexCache) {
        const s = await stat(indexPath);
        indexCache = { stat: s };
      }
      await sendFile(res, acceptEncoding, indexPath, ".html", indexCache.stat, "no-cache");
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  }
}

// ——— HTTP Server ———
const server = createServer(async (req, res) => {
  // Behind a TLS-terminating reverse proxy (Nginx/Traefik), req.socket is plain
  // HTTP even when the public connection was HTTPS — trust X-Forwarded-Proto
  // (nginx.vps.conf.example already sets it) so session cookies get the Secure
  // flag and Google OAuth's redirect_uri matches the real public scheme.
  const proto = req.headers["x-forwarded-proto"] ?? (req.socket.encrypted ? "https" : "http");
  const url = new URL(req.url, `${proto}://${req.headers.host}`);

  // Liveness check — intentionally bypasses the worker/DB so a slow/unavailable
  // database doesn't cause the container healthcheck to fail and restart-loop.
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const acceptEncoding = req.headers["accept-encoding"] ?? "";

  // Static files (non-API)
  if (!url.pathname.startsWith("/api/")) {
    await serveStatic(url.pathname, acceptEncoding, res);
    return;
  }

  // Read body
  let body = null;
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks).toString();
  }

  // Build Cloudflare Request
  const cfReq = new Request(url.href, {
    method: req.method,
    headers: req.headers,
    body,
  });

  try {
    const cfResp = await worker.fetch(cfReq, env);

    // fetch's Headers.forEach yields each Set-Cookie separately (not comma-joined
    // like other headers), so repeated keys must be collected into an array —
    // assigning into a plain object would silently drop all but the last one.
    const headers = {};
    cfResp.headers.forEach((v, k) => {
      if (headers[k] === undefined) headers[k] = v;
      else if (Array.isArray(headers[k])) headers[k].push(v);
      else headers[k] = [headers[k], v];
    });

    const respBody = await cfResp.text();
    if (respBody && acceptEncoding.includes("br")) {
      const compressed = brotliCompressSync(respBody);
      headers["content-encoding"] = "br";
      headers["content-length"] = compressed.length;
      res.writeHead(cfResp.status, headers);
      res.end(compressed);
    } else if (respBody && acceptEncoding.includes("gzip")) {
      const compressed = gzipSync(respBody);
      headers["content-encoding"] = "gzip";
      headers["content-length"] = compressed.length;
      res.writeHead(cfResp.status, headers);
      res.end(compressed);
    } else {
      res.writeHead(cfResp.status, headers);
      res.end(respBody);
    }
  } catch (err) {
    console.error("Worker error:", err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Murojaah running on http://0.0.0.0:${PORT}`);
});

process.on("SIGTERM", () => {
  pool.end().catch(() => undefined);
  if (redis) redis.quit().catch(() => undefined);
  server.close(() => process.exit(0));
});
