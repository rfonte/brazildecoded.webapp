const os = require("node:os");
const path = require("node:path");

const isCi = Boolean(process.env.CI);
const coverageDir = isCi
  ? "coverage"
  : path.join(os.tmpdir(), "brazildecoded-coverage");

module.exports = {
  test: {
    pool: "forks",
    singleFork: true,
    environment: "jsdom",
    include: ["tests/unit/**/*.mjs"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: isCi ? ["text", "html", "lcov"] : ["text", "json-summary"],
      reportsDirectory: coverageDir,
      include: ["src/assets/js/**/*.js"],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
};
