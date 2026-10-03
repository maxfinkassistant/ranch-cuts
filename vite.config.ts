import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the domain root (ranchcuts.com). Set VITE_BASE for a
// project path, e.g. VITE_BASE=/ranch-cuts/ on GitHub Pages.
export default defineConfig(({ command }) => ({
  base: command === "build" ? (process.env.VITE_BASE ?? "/") : "/",
  plugins: [react()],
  server: { port: 5177 },
}));
