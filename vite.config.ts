import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Oficjalna domena: https://sowinsky-studio.pl
export default defineConfig({
  plugins: [react()],
  base: "/",
});
