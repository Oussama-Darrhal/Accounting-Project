import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tesseractPublicAssets } from "./vite/tesseractAssets.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), tesseractPublicAssets()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/up": "http://127.0.0.1:8000",
    },
  },
});
