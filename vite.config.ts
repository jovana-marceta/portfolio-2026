import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The API server (server/server.mjs) runs on API_PORT during development.
// Vite proxies everything the React app doesn't serve itself to it.
const API = `http://localhost:${process.env.API_PORT || 3001}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": API,
      "/blog": API,
      "/rss.xml": API,
      "/uploads": API,
      "/healthz": API,
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      // Two pages: the portfolio and the admin panel
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
      },
    },
  },
});
