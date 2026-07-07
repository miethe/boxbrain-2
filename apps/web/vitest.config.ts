import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    include: ["features/**/*.test.ts", "features/**/*.test.tsx", "components/**/*.test.ts", "components/**/*.test.tsx", "lib/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"]
  }
});
