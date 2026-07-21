import { cloudflare } from "@cloudflare/vite-plugin";
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
  plugins: [react(), tailwindcss(), cloudflare()],
});
