import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // relative paths for static deployment
  build: {
    target: "es2020",
    outDir: "dist",
    assetsInlineLimit: 0, // keep assets as files
  },
  server: {
    open: true,
  },
});
