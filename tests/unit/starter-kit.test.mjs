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
    expect(payload.nome).toBe("User");
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
    expect(payload.nome).toBe("");
    expect(payload.referrer).toBe("");
  });

  it("buildPayload includes source, form_token, form_started_at, company and turnstile_token", () => {
    const kit = loadStarterKit();
    const payload = kit.buildPayload({
      type: "free_starter_kit",
      email: "a@b.com",
      name: "A",
      source: "free_starter_kit",
      formToken: "bd_starterkit_v1",
      formStartedAt: "1700000000000",
      company: "",
      turnstileToken: "tok_abc123",
      queryString: "",
    });
    expect(payload.source).toBe("free_starter_kit");
    expect(payload.form_token).toBe("bd_starterkit_v1");
    expect(payload.form_started_at).toBe("1700000000000");
    expect(payload.company).toBe("");
    expect(payload.turnstile_token).toBe("tok_abc123");
  });

  it("buildPayload converts consent true to boolean true", () => {
    const kit = loadStarterKit();
    expect(kit.buildPayload({ consent: true }).consent).toBe(true);
  });

  it("buildPayload converts consent 'on' to boolean true", () => {
    const kit = loadStarterKit();
    expect(kit.buildPayload({ consent: "on" }).consent).toBe(true);
  });

  it("buildPayload converts consent false to boolean false", () => {
    const kit = loadStarterKit();
    expect(kit.buildPayload({ consent: false }).consent).toBe(false);
  });

  it("buildPayload converts consent undefined to boolean false", () => {
    const kit = loadStarterKit();
    expect(kit.buildPayload({ consent: undefined }).consent).toBe(false);
  });

  it("buildPayload converts consent 'off' to boolean false", () => {
    const kit = loadStarterKit();
    expect(kit.buildPayload({ consent: "off" }).consent).toBe(false);
  });

  it("getUTM extracts utm params safely", () => {
    const kit = loadStarterKit();
    const utm = kit.getUTM("?utm_source=src&utm_medium=med&utm_campaign=cmp");
    expect(utm.utm_source).toBe("src");
    expect(utm.utm_medium).toBe("med");
    expect(utm.utm_campaign).toBe("cmp");
  });

  it("getUTM extracts utm_content and utm_term", () => {
    const kit = loadStarterKit();
    const utm = kit.getUTM("?utm_content=cnt&utm_term=trm");
    expect(utm.utm_content).toBe("cnt");
    expect(utm.utm_term).toBe("trm");
  });

  it("getUTM returns empty strings when query string is empty", () => {
    const kit = loadStarterKit();
    const utm = kit.getUTM("");
    expect(utm.utm_source).toBe("");
    expect(utm.utm_medium).toBe("");
    expect(utm.utm_campaign).toBe("");
    expect(utm.utm_content).toBe("");
    expect(utm.utm_term).toBe("");
  });

  it("getUTM trims whitespace", () => {
    const kit = loadStarterKit();
    const utm = kit.getUTM("?utm_source= src &utm_medium= med &utm_campaign= cmp ");
    expect(utm.utm_source).toBe("src");
    expect(utm.utm_medium).toBe("med");
    expect(utm.utm_campaign).toBe("cmp");
  });

  it("buildPayload includes utm_content and utm_term from query string", () => {
    const kit = loadStarterKit();
    const payload = kit.buildPayload({
      queryString: "?utm_content=banner&utm_term=brazil+travel",
    });
    expect(payload.utm_content).toBe("banner");
    expect(payload.utm_term).toBe("brazil+travel");
  });

  it("isHumanTiming returns true when elapsed time is at or above minMs", () => {
    const kit = loadStarterKit();
    const now = 10000;
    expect(kit.isHumanTiming(7000, 3000, now)).toBe(true);
    expect(kit.isHumanTiming(7000, 3000, 10000)).toBe(true);
  });

  it("isHumanTiming returns false when elapsed time is below minMs", () => {
    const kit = loadStarterKit();
    expect(kit.isHumanTiming(9000, 3000, 10000)).toBe(false);
  });

  it("isHumanTiming uses 3000ms default when minMs is not provided", () => {
    const kit = loadStarterKit();
    const start = Date.now() - 4000;
    expect(kit.isHumanTiming(start)).toBe(true);
    const recent = Date.now() - 1000;
    expect(kit.isHumanTiming(recent)).toBe(false);
  });

  it("isHumanTiming returns false when startedAt is empty string", () => {
    const kit = loadStarterKit();
    expect(kit.isHumanTiming("", 3000, 10000)).toBe(false);
  });

  it("isHumanTiming returns false when startedAt is NaN", () => {
    const kit = loadStarterKit();
    expect(kit.isHumanTiming(NaN, 3000, 10000)).toBe(false);
  });

  it("isHumanTiming returns false when startedAt is 0 or negative", () => {
    const kit = loadStarterKit();
    expect(kit.isHumanTiming(0, 3000, 10000)).toBe(false);
    expect(kit.isHumanTiming(-1, 3000, 10000)).toBe(false);
  });

  it("attaches BDStarterKit to globalThis", () => {
    const kit = loadStarterKit();
    expect(kit).toBeDefined();
    expect(kit.isValidEmail).toBeDefined();
    expect(kit.buildPayload).toBeDefined();
    expect(kit.getUTM).toBeDefined();
    expect(kit.isHumanTiming).toBeDefined();
  });

  it("isValidEmail rejects email with more than 254 characters", () => {
    const kit = loadStarterKit();
    const longEmail = "a".repeat(255) + "@example.com";
    expect(kit.isValidEmail(longEmail)).toBe(false);
  });

  it("getUTM handles malformed queries", () => {
    const kit = loadStarterKit();
    expect(kit.getUTM("utm_source=untrimmed ")).toEqual(expect.objectContaining({
      utm_source: "untrimmed"
    }));
    expect(kit.getUTM("utm_term=term with space")).toEqual(expect.objectContaining({
      utm_term: "term+with+space"
    }));
  });
});

