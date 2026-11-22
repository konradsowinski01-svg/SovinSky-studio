import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages: https://<user>.github.io/SovinSky-studio/
export default defineConfig({
  plugins: [react()],
  base: "/SovinSky-studio/",
});
