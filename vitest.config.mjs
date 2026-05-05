import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    pool: "forks",
    include: ["tests/unit/**/*.mjs"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["src/assets/js/**/*.js"],
      exclude: [
        "src/assets/js/lib/**",
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "tests/**",
        "tools/**",
        "**/*.config.*",
        ".eleventy.js",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
