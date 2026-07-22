/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DealSpine web app. The API server (server/index.ts) listens on 8791;
// everything under /api is proxied to it in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8790,
    proxy: {
      "/api": "http://localhost:8791",
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
