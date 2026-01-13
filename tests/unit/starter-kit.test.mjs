import { describe, it, expect } from "vitest";
import starterKit from "../../src/assets/js/lib/starter-kit.js";

const { isValidEmail, getUTM, buildPayload } = starterKit;

describe("starter-kit utils", () => {
  it("validates email format", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
  });

  it("parses UTM params", () => {
    const utm = getUTM("?utm_source=google&utm_medium=cpc&utm_campaign=promo");
    expect(utm).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "promo",
    });
  });

  it("builds payload with UTM and metadata", () => {
    const payload = buildPayload({
      type: "starter_kit",
      email: "user@example.com",
      name: "User",
      page: "/pages/cadastro.html",
      referrer: "http://localhost:8080/",
      userAgent: "test-agent",
      queryString: "?utm_source=x&utm_medium=y&utm_campaign=z",
    });

    expect(payload).toEqual({
      type: "starter_kit",
      email: "user@example.com",
      name: "User",
      page: "/pages/cadastro.html",
      referrer: "http://localhost:8080/",
      user_agent: "test-agent",
      utm_source: "x",
      utm_medium: "y",
      utm_campaign: "z",
    });
  });
});
