import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/widget.ts",
      name: "AgenciaChatbot",
      fileName: () => "widget.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
    emptyOutDir: true,
  },
});
