const { test, expect } = require("@playwright/test");

test("starter kit form submits and shows success message", async ({ page }) => {
  await page.route("https://brazildecoded-api.rodcafonte.workers.dev/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sucesso: true, mensagem: "Thanks! Check your email for the download link." }),
    });
  });

  await page.goto("/free-starter-kit");

  await page.evaluate(() => {
    const startedAt = document.getElementById("starterFormStartedAt");
    if (startedAt) startedAt.value = String(Date.now() - 4000);

    // inject Turnstile token so the anti-bot check does not block submission
    const form = document.getElementById("starterKitForm");
    let turnstile = form && form.querySelector('[name="cf-turnstile-response"]');
    if (!turnstile) {
      turnstile = document.createElement("input");
      turnstile.type = "hidden";
      turnstile.name = "cf-turnstile-response";
      form && form.appendChild(turnstile);
    }
    turnstile.value = "e2e-test-token";
  });

  await page.getByLabel("Your email").fill("user@example.com");
  await page
    .getByRole("checkbox", {
      name: /receive the Starter Kit and occasional BrazilDecoded updates/i,
    })
    .check();
  await page.getByRole("button", { name: "Send me the Starter Kit" }).click();

  await expect(page.locator("[data-status]")).toContainText(
    "Thanks! Check your email",
    { timeout: 5000 }
  );
});
