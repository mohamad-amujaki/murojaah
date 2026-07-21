/**
 * Build script: bundles the Cloudflare Worker for Node.js VPS deployment.
 * Run: node scripts/build.mjs
 */
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

await build({
  entryPoints: [resolve(ROOT, "apps/worker/index.ts")],
  bundle: true,
  minify: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: resolve(ROOT, "dist/worker/index.mjs"),
  external: ["node:async_hooks"],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  sourcemap: false,
});

console.log("Worker built → dist/worker/index.mjs");
