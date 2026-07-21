/**
 * Local dev entry point: builds the worker bundle once, then runs server.mjs
 * (Node + MySQL, per .env) and the Vite frontend dev server side by side.
 * Replaces the old Cloudflare Workers/D1 `vite dev` flow, which no longer
 * works now that the worker talks to MySQL via mysql2 (Node-only, not
 * Workers-compatible).
 */
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

await import("./build.mjs");

const children = [];
function run(name, command, args, env) {
  const child = spawn(command, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
  child.on("exit", (code) => {
    if (code && code !== 0) console.error(`✘ ${name} exited with code ${code}`);
  });
  children.push(child);
  return child;
}

run("server.mjs", "node", ["--env-file=.env", "server.mjs"], {
  PORT: "8787",
  MIGRATIONS_DIR: resolve(ROOT, "packages/db/migrations"),
  STATIC_DIR: resolve(ROOT, "apps/web/dist/client"),
});

run("vite", "pnpm", ["--filter", "@murojaah/web", "exec", "vite", "dev", "--config", "vite.config.docker.ts"]);

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
