import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function htmlNonBlockingCss() {
  return {
    name: "html-non-blocking-css",
    enforce: "post",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /<link\s+rel="stylesheet"((?:(?!onload=)[^>])*)>(?!<\/noscript>)/g,
        (_, attrs) =>
          `<link rel="preload" as="style"${attrs} onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet"${attrs}></noscript>`
      );
    },
  };
}

export default defineConfig({
  build: {
    target: "es2018",
    cssTarget: "safari13",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom")) return "vendor-react";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "#": "/src",
    },
  },
  plugins: [react(), tailwindcss(), htmlNonBlockingCss()],
  // Only affects `vite dev`, not `vite build` — proxies API calls to the
  // Node/MySQL server.mjs backend started alongside it by scripts/dev.mjs.
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
