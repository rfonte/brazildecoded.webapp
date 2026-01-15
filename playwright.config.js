const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  reporter: [["html", { open: "never", clean: false }]],
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
  },
  webServer: {
    command: "npm run serve",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
