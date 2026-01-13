const { test, expect } = require("@playwright/test");

test("starter kit form submits and redirects", async ({ page }) => {
  await page.route("https://hook.us2.make.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "OK",
    });
  });

  await page.goto("/pages/cadastro.html");
  await page.getByLabel("Your email").fill("user@example.com");
  await page
    .getByLabel("I agree to receive BrazilDecoded emails and offers.")
    .check();
  await page.getByRole("button", { name: "Send me the Starter Kit" }).click();

  await expect(page).toHaveURL(/\/pages\/contato-sucesso\.html$/);
});
