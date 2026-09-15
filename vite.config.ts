import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [/^@midnight-ntwrk\/.*/],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
