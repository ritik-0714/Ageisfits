import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // MediaPipe is imported lazily when the camera starts. Without pre-bundling, Vite discovers it mid-session,
  // re-optimises and RELOADS the page - which looks like "the AI camera is broken". Pre-bundle it up front.
  optimizeDeps: { include: ["@mediapipe/tasks-vision"] },
  server: { port: 5173, proxy: { "/api": "http://localhost:5000" } },
  worker: { format: "es" },
  build: { chunkSizeWarningLimit: 1500 },
});
