import { describe, it, expect, beforeEach } from "vitest";
import { createContext, runInContext } from "vm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const root_path = __filename.split("/tests")[0];

function createSandbox(fileName) {
  const sandbox = {
    require,
    module: { exports: {} },
    exports: {},
    console,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    JSON,
    ArrayBuffer,
    Uint8Array,
    atob,
    btoa,
    Date,
    Math,
    Number,
    String,
    Object,
    Array,
    RegExp,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    globalThis: {},
    process: { env: {} },
  };
  Object.defineProperty(sandbox, "globalThis", {
    get() { return sandbox; },
    set(v) {},
    configurable: true,
  });
  return sandbox;
}

function runFileInSandbox(sandbox, filePath) {
  const code = fileURLToPath(new URL(filePath, import.meta.url));
  const fs = require("fs");
  const content = fs.readFileSync(code, "utf-8");
  runInContext(content, createContext(sandbox), { filename: code });
  sandbox.globalThis.BDStarterKit = sandbox.module?.exports;
}

describe("starter-kit.js", () => {
  beforeEach(() => {
    delete globalThis.BDStarterKit;
  });

  it("isValidEmail validates basic email formats", () => {
    const sandbox = createSandbox();
    runFileInSandbox(sandbox, "../../src/assets/js/lib/starter-kit.js");
    expect(sandbox.globalThis.BDStarterKit.isValidEmail("test@example.com")).toBe(true);
    expect(sandbox.globalThis.BDStarterKit.isValidEmail("invalid")).toBe(false);
    expect(sandbox.globalThis.BDStarterKit.isValidEmail("")).toBe(false);
  });

  it("buildPayload returns expected starter kit payload", () => {
    const sandbox = createSandbox();
    runFileInSandbox(sandbox, "../../src/assets/js/lib/starter-kit.js");
    const payload = sandbox.globalThis.BDStarterKit.buildPayload({
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
    const sandbox = createSandbox();
    runFileInSandbox(sandbox, "../../src/assets/js/lib/starter-kit.js");
    const payload = sandbox.globalThis.BDStarterKit.buildPayload({
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
    const sandbox = createSandbox();
    runFileInSandbox(sandbox, "../../src/assets/js/lib/starter-kit.js");
    const utm = sandbox.globalThis.BDStarterKit.getUTM(
      "?utm_source=src&utm_medium=med&utm_campaign=cmp"
    );
    expect(utm.utm_source).toBe("src");
    expect(utm.utm_medium).toBe("med");
    expect(utm.utm_campaign).toBe("cmp");
  });

  it("getUTM returns empty strings when query string is empty", () => {
    const sandbox = createSandbox();
    runFileInSandbox(sandbox, "../../src/assets/js/lib/starter-kit.js");
    const utm = sandbox.globalThis.BDStarterKit.getUTM("");
    expect(utm.utm_source).toBe("");
    expect(utm.utm_medium).toBe("");
    expect(utm.utm_campaign).toBe("");
  });

  it("getUTM trims whitespace", () => {
    const sandbox = createSandbox();
    runFileInSandbox(sandbox, "../../src/assets/js/lib/starter-kit.js");
    const utm = sandbox.globalThis.BDStarterKit.getUTM(
      "?utm_source= src &utm_medium= med &utm_campaign= cmp "
    );
    expect(utm.utm_source).toBe("src");
    expect(utm.utm_medium).toBe("med");
    expect(utm.utm_campaign).toBe("cmp");
  });

  it("attaches BDStarterKit to globalThis in a browser-like context", () => {
    const sandbox = createSandbox();
    runFileInSandbox(sandbox, "../../src/assets/js/lib/starter-kit.js");
    expect(sandbox.globalThis.BDStarterKit).toBeDefined();
  });
});

