import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const root_path = join(dirname(__filename), "..", "..");

function loadStarterKit() {
  delete globalThis.BDStarterKit;
  const kit = require(join(root_path, "src/assets/js/lib/starter-kit.js"));
  globalThis.BDStarterKit = kit;
  return kit;
}

describe("starter-kit.js", () => {
  beforeEach(() => {
    delete globalThis.BDStarterKit;
  });

  it("isValidEmail validates basic email formats", () => {
    const kit = loadStarterKit();
    expect(kit.isValidEmail("test@example.com")).toBe(true);
    expect(kit.isValidEmail("invalid")).toBe(false);
    expect(kit.isValidEmail("")).toBe(false);
  });

  it("buildPayload returns expected starter kit payload", () => {
    const kit = loadStarterKit();
    const payload = kit.buildPayload({
      type: "starter_kit",
      email: "test@example.com",
      name: "User",
      page: "/free-starter-kit",
      referrer: "https://google.com",
      userAgent: "Mozilla/5.0",
      queryString: "?utm_source=google&utm_medium=cpc&utm_campaign=test",
    });
    expect(payload.type).toBe("starter_kit");
    expect(payload.email).toBe("test@example.com");
    expect(payload.name).toBe("User");
    expect(payload.page).toBe("/free-starter-kit");
    expect(payload.user_agent).toBe("Mozilla/5.0");
    expect(payload.utm_source).toBe("google");
    expect(payload.utm_medium).toBe("cpc");
    expect(payload.utm_campaign).toBe("test");
  });

  it("buildPayload handles empty and null values safely", () => {
    const kit = loadStarterKit();
    const payload = kit.buildPayload({
      email: null,
      name: undefined,
      page: null,
      referrer: undefined,
      userAgent: null,
      queryString: undefined,
    });
    expect(payload.email).toBe("");
    expect(payload.name).toBe("");
    expect(payload.referrer).toBe("");
  });

  it("getUTM extracts utm params safely", () => {
    const kit = loadStarterKit();
    const utm = kit.getUTM("?utm_source=src&utm_medium=med&utm_campaign=cmp");
    expect(utm.utm_source).toBe("src");
    expect(utm.utm_medium).toBe("med");
    expect(utm.utm_campaign).toBe("cmp");
  });

  it("getUTM returns empty strings when query string is empty", () => {
    const kit = loadStarterKit();
    const utm = kit.getUTM("");
    expect(utm.utm_source).toBe("");
    expect(utm.utm_medium).toBe("");
    expect(utm.utm_campaign).toBe("");
  });

  it("getUTM trims whitespace", () => {
    const kit = loadStarterKit();
    const utm = kit.getUTM("?utm_source= src &utm_medium= med &utm_campaign= cmp ");
    expect(utm.utm_source).toBe("src");
    expect(utm.utm_medium).toBe("med");
    expect(utm.utm_campaign).toBe("cmp");
  });

  it("attaches BDStarterKit to globalThis", () => {
    const kit = loadStarterKit();
    expect(kit).toBeDefined();
    expect(kit.isValidEmail).toBeDefined();
    expect(kit.buildPayload).toBeDefined();
    expect(kit.getUTM).toBeDefined();
  });

  it("isValidEmail rejects email with more than 254 characters", () => {
    const kit = loadStarterKit();
    const longEmail = "a".repeat(255) + "@example.com";
    expect(kit.isValidEmail(longEmail)).toBe(false);
  });
});
