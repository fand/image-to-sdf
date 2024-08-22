import glsl from "vite-plugin-glsl";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [glsl()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "image-to-sdf",
      fileName: "image-to-sdf",
    },
  },
});
