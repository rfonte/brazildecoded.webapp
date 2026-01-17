const { test, expect } = require("@playwright/test");

test("starter kit form submits and redirects", async ({ page }) => {
  await page.route("https://hook.us2.make.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "OK",
    });
  });

  await page.goto("/free-starter-kit");
  await page.evaluate(() => {
    const startedAt = document.getElementById("starterFormStartedAt");
    if (startedAt) {
      startedAt.value = String(Date.now() - 4000);
    }
  });
  await page.getByLabel("Your email").fill("user@example.com");
  await page
    .getByRole("checkbox", {
      name: /i agree to the processing of my personal data/i,
    })
    .check();
  await page.getByRole("button", { name: "Send me the Starter Kit" }).click();

  await page.waitForTimeout(2000); // wait for redirect

  await expect(page).toHaveURL(/\/pages\/contato-sucesso\.html$/);
});
