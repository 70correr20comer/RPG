import { defineConfig } from "vite";
import { youwareVitePlugin } from "@youware/vite-plugin-react";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  base: '/RPG/',
  plugins: [youwareVitePlugin(), react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
  },
});
