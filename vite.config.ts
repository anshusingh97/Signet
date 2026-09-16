import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import path from "path";

export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      "isomorphic-ws": path.resolve(__dirname, "mock-ws.js"),
      // Bypass the dist/index.js entirely — import the compiled contract
      // source directly so Vite always gets the correct Contract class.
      "@midnight-ntwrk/bboard-contract": path.resolve(
        __dirname,
        "preprod-deployment/contracts/src/index.ts"
      ),
    },
  },
  build: {
    target: "esnext",
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
