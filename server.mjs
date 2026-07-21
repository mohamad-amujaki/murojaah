/**
 * Node.js entry point — runs bundled Cloudflare Worker on VPS with better-sqlite3.
 * Replaces Cloudflare D1 API with a better-sqlite3 adapter.
 */

import { createServer } from "node:http";
import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT ?? "8787", 10);
const DATABASE_URL = process.env.DATABASE_URL ?? "file:/app/data/murojaah.db";
const STATIC_DIR = process.env.STATIC_DIR ?? resolve(__dirname, "static");

// Init SQLite
const dbPath = DATABASE_URL.startsWith("file:") ? DATABASE_URL.slice(5) : DATABASE_URL;

// Ensure data dir exists
const dbDir = dbPath.includes("/") ? dbPath.slice(0, dbPath.lastIndexOf("/")) : ".";
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");
db.pragma("temp_store = MEMORY");
db.pragma("mmap_size = 268435456"); // 256MB

// Verify
try {
  db.prepare("SELECT 1").get();
  console.log(`✓ Database: ${dbPath}`);
} catch (e) {
  console.error("✘ Database error:", e.message);
  process.exit(1);
}

// ——— Auto-migrations ———
// Applies each packages/db/migrations/*.sql exactly once (tracked in _migrations),
// then the full-Quran seed. Replaces `wrangler d1 migrations apply`, which only
// targets Cloudflare D1 and can't reach this SQLite file on the VPS.
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? resolve(__dirname, "migrations");
const SEED_FILES = [resolve(__dirname, "seeds", "quran-full.sql")];
try {
  db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map((r) => r.name));
  if (existsSync(MIGRATIONS_DIR)) {
    for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
      if (applied.has(file)) continue;
      db.exec(readFileSync(resolve(MIGRATIONS_DIR, file), "utf8"));
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
      console.log(`✓ Migration applied: ${file}`);
    }
  } else {
    console.warn(`⚠ Migrations dir not found: ${MIGRATIONS_DIR}`);
  }
  for (const seedPath of SEED_FILES) {
    const name = `seed:${seedPath.split("/").pop()}`;
    if (applied.has(name) || !existsSync(seedPath)) continue;
    db.exec(readFileSync(seedPath, "utf8"));
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(name);
    console.log(`✓ Seed applied: ${name}`);
  }
} catch (e) {
  console.error("✘ Migration error:", e.message);
  process.exit(1);
}

// ——— D1-compatible adapter for better-sqlite3 ———
// Faithful to Cloudflare's D1 client API as consumed by drizzle-orm/d1:
//   stmt.bind(...).all()  → { results: Row[], success, meta }   (drizzle destructures { results })
//   stmt.bind(...).raw()  → Array<Array<value>>                 (drizzle's select fast-path)
//   stmt.bind(...).first(col?) → Row | column value | null
//   stmt.bind(...).run()  → { success, meta: { changes, last_row_id }, results }
// Errors intentionally propagate so Drizzle surfaces the real SQL failure.
const coerceParam = (p) => {
  if (typeof p === "boolean") return p ? 1 : 0; // D1 accepts booleans; better-sqlite3 does not
  if (p === undefined) return null;
  return p;
};

const d1 = {
  prepare: (sql) => ({
    bind: (...params) => {
      const stmt = db.prepare(sql);
      const bound = params.map(coerceParam);
      const isReader = stmt.reader; // true when the statement returns rows (SELECT / ...RETURNING)
      const meta = (info) => ({ changes: info.changes, last_row_id: Number(info.lastInsertRowid), duration: 0 });
      return {
        all: async () => {
          if (isReader) return { results: stmt.all(...bound), success: true, meta: { duration: 0 } };
          const info = stmt.run(...bound);
          return { results: [], success: true, meta: meta(info) };
        },
        raw: async (options) => {
          const rows = stmt.raw(true).all(...bound);
          if (options?.columnNames) return [stmt.columns().map((c) => c.name), ...rows];
          return rows;
        },
        first: async (colName) => {
          const row = stmt.get(...bound);
          if (row === undefined) return null;
          return typeof colName === "string" ? row[colName] : row;
        },
        run: async () => {
          if (isReader) return { results: stmt.all(...bound), success: true, meta: { duration: 0 } };
          const info = stmt.run(...bound);
          return { results: [], success: true, meta: meta(info) };
        },
      };
    },
  }),
  batch: (statements) => Promise.all(statements.map((s) => s.all())),
  exec: async (sql) => {
    db.exec(sql);
  },
};

// ——— Env ———
const env = {
  DB: d1,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "production",
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

function serveStatic(urlPath, res) {
  const filePath = resolve(STATIC_DIR, urlPath === "/" ? "/index.html" : urlPath);
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) throw new Error("Not a file");
    const ext = "." + filePath.split(".").pop();
    const body = readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "public, max-age=86400",
      "ETag": `"${stat.mtimeMs}"`,
    });
    res.end(body);
  } catch {
    // Try index.html fallback for SPA
    try {
      const indexPath = resolve(STATIC_DIR, "index.html");
      const stat = statSync(indexPath);
      const body = readFileSync(indexPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": stat.size });
      res.end(body);
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

  // Static files (non-API)
  if (!url.pathname.startsWith("/api/")) {
    serveStatic(url.pathname, res);
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

    const headers = {};
    cfResp.headers.forEach((v, k) => { headers[k] = v; });

    res.writeHead(cfResp.status, headers);
    const respBody = await cfResp.text();
    res.end(respBody);
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
  db.close();
  server.close(() => process.exit(0));
});
