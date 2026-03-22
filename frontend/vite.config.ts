import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/graph": "http://localhost:3000",
      "/status": "http://localhost:3000",
      "/api": "http://localhost:3000",
      "/events": "http://localhost:3000",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
