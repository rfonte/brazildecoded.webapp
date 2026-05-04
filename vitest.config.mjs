import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    pool: "forks",
    singleFork: true,
    include: ["tests/unit/**/*.mjs"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
  coverage: {
    provider: "v8",
    reportsDirectory: "coverage",
    include: ["src/**/*.js"],
    exclude: ["src/**/lib/**", "src/assets/js/lib/**"],
    thresholds: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
});
