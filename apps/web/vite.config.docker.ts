import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2018",
    cssTarget: "safari13",
  },
  resolve: {
    alias: {
      "#": "/src",
    },
  },
  plugins: [react(), tailwindcss()],
  // Only affects `vite dev`, not `vite build` — proxies API calls to the
  // Node/MySQL server.mjs backend started alongside it by scripts/dev.mjs.
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
