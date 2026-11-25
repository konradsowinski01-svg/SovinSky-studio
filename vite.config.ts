import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages: https://<user>.github.io/SowinSky-studio/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Lokalnie: `/`. Na GitHub Pages: `/SowinSky-studio/`.
  base: command === "build" ? "/SowinSky-studio/" : "/",
}));
