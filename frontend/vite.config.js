import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Where the FastAPI backend runs in development. Override if port 8000 is taken, e.g.
//   PowerShell: $env:NUTRISCAN_API_URL="http://127.0.0.1:8010"; npm run dev
const BACKEND = process.env.NUTRISCAN_API_URL || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true, // fail instead of silently moving onto another app's port
    proxy: {
      "/api": BACKEND,
      "/uploads": BACKEND,
    },
  },
});
