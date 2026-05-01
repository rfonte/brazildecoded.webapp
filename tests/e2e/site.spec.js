const { test, expect } = require("@playwright/test");

const seoLandingPages = [
  {
    path: "/brazil-cultural-etiquette/",
    title: "Brazil cultural etiquette for travelers",
    breadcrumbName: "Brazil Cultural Etiquette for Travelers",
  },
  {
    path: "/brazil-travel-tips-first-time/",
    title: "Brazil travel tips for first-time visitors",
    breadcrumbName: "Brazil Travel Tips for First-Time Visitors",
  },
  {
    path: "/is-brazil-safe-for-tourists/",
    title: "Is Brazil safe for tourists?",
    breadcrumbName: "Is Brazil Safe for Tourists?",
  },
];

test.describe("Site E2E smoke tests", () => {
  test("homepage has starter kit CTA and launches free starter kit page", async ({ page }) => {
    await page.goto("/");

    const starterKitLink = page.locator("a.cta.primary", {
      hasText: /get the free starter kit/i,
    }).first();
    await expect(starterKitLink).toHaveAttribute("href", "/free-starter-kit/");

    await starterKitLink.click();
    await expect(page).toHaveURL("/free-starter-kit/");
    await expect(page.getByRole("heading", { name: /free brazil travel starter kit/i })).toBeVisible();
  });

  test("new landing pages are accessible and include breadcrumb structured data", async ({ page }) => {
    for (const landingPage of seoLandingPages) {
      await page.goto(landingPage.path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(landingPage.title);

      const scripts = await page
        .locator("script[type=\"application/ld+json\"]")
        .allTextContents();
      const breadcrumbText = scripts.find((text) =>
        text.includes("\"@type\": \"BreadcrumbList\"")
      );

      expect(breadcrumbText).toBeTruthy();
      expect(breadcrumbText).toContain(landingPage.breadcrumbName);
      expect(breadcrumbText).toContain("\"@type\": \"BreadcrumbList\"");
    }
  });

  test("contact page submits successfully and shows confirmation feedback", async ({ page }) => {
    await page.route("https://hook.us2.make.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "OK",
      });
    });

    await page.goto("/contact/");

    const privacyLink = page.locator("#contactForm").getByRole("link", {
      name: /privacy policy/i,
    });
    await expect(privacyLink).toHaveAttribute("href", "/privacy/");

    await page.fill("#contactName", "Tester");
    await page.fill("#contactEmail", "tester@example.com");
    await page.fill("#contactMessage", "I want help planning my Brazil trip.");
    await page.evaluate(() => {
      const startedAt = document.getElementById("contactFormStartedAt");
      if (startedAt) {
        startedAt.value = String(Date.now() - 4000);
      }
    });
    await page.check("#contactConsent");
    await page.click("#contactSubmit");

    await expect(page.locator("#contactFeedback")).toHaveText("Message sent. Thank you!");
  });
});
