import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "frontend"),
  plugins: [tailwindcss(), svelte()],
  build: {
    outDir: path.resolve(__dirname, "web-dist"),
    emptyOutDir: true
  }
});
