import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    port: 43177,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 43177,
    strictPort: true,
    host: true,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
