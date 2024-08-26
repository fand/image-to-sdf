import glsl from "vite-plugin-glsl";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [glsl()],
  build: {
    outDir: resolve(__dirname, "docs"),
  },
  base: "./",
});
