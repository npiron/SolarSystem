import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      external: [
        /^https:\/\/cdn\.jsdelivr\.net\/.*/,
      ],
    },
  },
});
