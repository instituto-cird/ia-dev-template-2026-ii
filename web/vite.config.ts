import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, /api y /health se reenvían al backend FastAPI (puerto 8000),
// así el navegador habla con un solo origen y no hay problemas de CORS.
const backend = process.env.BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": backend,
      "/health": backend,
    },
  },
});
