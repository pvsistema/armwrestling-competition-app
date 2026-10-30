import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root: path.resolve(import.meta.dirname, "web"),
  base: "/",
  publicDir: path.resolve(root, "public"),
  plugins: [react()],
  css: { postcss: path.resolve(root, "postcss.config.cjs") },
  resolve: { alias: { "@": path.resolve(root, "src") } },
  build: {
    outDir: path.resolve(root, "dist-desktop"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
  },
});
