import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import starterKit from "../../src/assets/js/lib/starter-kit.js";

const { isValidEmail, getUTM, buildPayload } = starterKit;

describe("starter-kit utils", () => {
  it("validates email format", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
  });

  it("rejects invalid email edge cases", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail("user@@example.com")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
    expect(isValidEmail("user@.com")).toBe(false);
    expect(isValidEmail("user@example.com.")).toBe(false);
  });

  it("trims and rejects overly long emails", () => {
    expect(isValidEmail(" user@example.com ")).toBe(true);
    const longEmail = "a".repeat(250) + "@e.com";
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it("parses UTM params", () => {
    const utm = getUTM("?utm_source=google&utm_medium=cpc&utm_campaign=promo");
    expect(utm).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "promo",
    });
  });

  it("handles missing UTM params", () => {
    const utm = getUTM("");
    expect(utm).toEqual({
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
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

  it("builds payload with defaults when fields are missing", () => {
    const payload = buildPayload({ queryString: "" });
    expect(payload).toEqual({
      type: "",
      email: "",
      name: "",
      page: "",
      referrer: "",
      user_agent: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
    });
  });

  it("attaches BDStarterKit to window in a browser-like context", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const scriptPath = join(
      __dirname,
      "../../src/assets/js/lib/starter-kit.js"
    );
    const code = readFileSync(scriptPath, "utf8");
    const sandbox = {
      URLSearchParams,
    };
    sandbox.window = sandbox;
    const context = createContext(sandbox);
    const script = new Script(code, { filename: scriptPath });
    script.runInContext(context);
    expect(context.BDStarterKit).toBeTruthy();
    expect(typeof context.BDStarterKit.isValidEmail).toBe("function");
  });

  it("exports BDStarterKit via module.exports when available", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const scriptPath = join(
      __dirname,
      "../../src/assets/js/lib/starter-kit.js"
    );
    const code = readFileSync(scriptPath, "utf8");
    const sandbox = {
      URLSearchParams,
      module: { exports: {} },
    };
    sandbox.window = sandbox;
    const context = createContext(sandbox);
    const script = new Script(code, { filename: scriptPath });
    script.runInContext(context);
    expect(context.module.exports).toBeTruthy();
    expect(typeof context.module.exports.isValidEmail).toBe("function");
  });
});
