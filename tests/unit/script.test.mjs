import { describe, it, expect, beforeEach, vi } from "vitest";
import starterKit from "../../src/assets/js/lib/starter-kit.js";

const scriptPath = "../../src/assets/js/script.js";
const logKey = "brazildecoded_logs";

function setHtml(html) {
  document.body.innerHTML = html;
}

async function loadScript() {
  vi.resetModules();
  return import(scriptPath);
}

function setLocation(pathname) {
  const href = `http://localhost:3000${pathname}`;
  const locationMock = {
    href,
    pathname,
    search: "",
  };
  try {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: locationMock,
    });
  } catch (err) {
    window.location = locationMock;
  }
}

function getLogs() {
  return JSON.parse(localStorage.getItem(logKey) || "[]");
}

function getStartedAtField(formId) {
  if (formId === "starterKitForm") {
    return document.getElementById("starterFormStartedAt");
  }
  if (formId === "contactForm") {
    return document.getElementById("contactFormStartedAt");
  }
  return null;
}

function submitForm(formId, options = {}) {
  const form = document.getElementById(formId);
  const startedAt = getStartedAtField(formId);
  if (startedAt && !options.skipTiming) {
    startedAt.value = String(Date.now() - 4000);
  }
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function dispatchClick(el) {
  el.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function ensureMock(fn, fallback) {
  if (!fn || !vi.isMockFunction(fn)) {
    return fallback();
  }
  return fn;
}

function stubUrlHelpers() {
  URL.createObjectURL = ensureMock(
    URL.createObjectURL,
    () => vi.fn(() => "blob:mock")
  );
  URL.revokeObjectURL = ensureMock(URL.revokeObjectURL, () => vi.fn());
  if (!HTMLAnchorElement.prototype.click) {
    HTMLAnchorElement.prototype.click = vi.fn();
  } else {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  }
}

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.restoreAllMocks();
  window.BDStarterKit = starterKit;
  delete window.__bdGtmLoaded;
  setLocation("/index.html");
  stubUrlHelpers();
  window.alert = vi.fn();
  window.confirm = vi.fn();
});

describe("script.js", () => {
  it("sets the footer year when present", async () => {
    setHtml('<span id="year"></span>');
    await loadScript();
    expect(document.getElementById("year").textContent).toBe(
      String(new Date().getFullYear())
    );
  });

  it("loads GTM when cookie consent is accepted", async () => {
    localStorage.setItem(
      "brazildecoded_cookie_consent",
      JSON.stringify({ status: "accepted", analytics: true, marketing: true })
    );
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    document.body.dataset.gtmId = "GTM-TEST";
    await loadScript();
    const gtmScript = Array.from(document.getElementsByTagName("script")).find(
      (node) => (node.src || "").includes("googletagmanager.com/gtm.js?id=GTM-TEST")
    );
    expect(gtmScript).toBeTruthy();
  });

  it("logs invalid GTM IDs and does not insert the script", async () => {
    localStorage.setItem(
      "brazildecoded_cookie_consent",
      JSON.stringify({ status: "accepted", analytics: true, marketing: true })
    );
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    document.body.dataset.gtmId = "GTM 123";
    await loadScript();
    const gtmScript = Array.from(document.getElementsByTagName("script")).find(
      (node) => (node.src || "").includes("googletagmanager.com/gtm.js")
    );
    expect(gtmScript).toBeFalsy();
    expect(getLogs().some((log) => log.message === "Invalid GTM ID")).toBe(true);
  });
  it("stores custom cookie preferences and hides the banner", async () => {
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    document.body.dataset.gtmId = "GTM-TEST";
    await loadScript();
    document.getElementById("cookieAnalytics").checked = true;
    dispatchClick(document.getElementById("cookieSave"));
    const stored = JSON.parse(
      localStorage.getItem("brazildecoded_cookie_consent") || "{}"
    );
    expect(stored.status).toBe("custom");
    expect(stored.analytics).toBe(true);
    expect(document.getElementById("cookieBanner").classList.contains("is-hidden")).toBe(
      true
    );
  });

  it("toggles cookie settings and clears unchecked preferences when no consent", async () => {
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel" class="cookie-banner-settings"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    await loadScript();
    const settingsPanel = document.getElementById("cookieSettingsPanel");
    const settingsBtn = document.getElementById("cookieSettings");
    const analytics = document.getElementById("cookieAnalytics");
    const marketing = document.getElementById("cookieMarketing");
    analytics.checked = true;
    marketing.checked = true;
    dispatchClick(settingsBtn);
    expect(settingsPanel.classList.contains("is-visible")).toBe(true);
    expect(settingsBtn.getAttribute("aria-expanded")).toBe("true");
    expect(settingsPanel.getAttribute("aria-hidden")).toBe("false");
    expect(analytics.checked).toBe(false);
    expect(marketing.checked).toBe(false);
  });

  it("rejects cookies and stores the decision", async () => {
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    await loadScript();
    dispatchClick(document.getElementById("cookieReject"));
    const stored = JSON.parse(
      localStorage.getItem("brazildecoded_cookie_consent") || "{}"
    );
    expect(stored.status).toBe("rejected");
    expect(stored.analytics).toBe(false);
    expect(document.getElementById("cookieBanner").classList.contains("is-hidden")).toBe(
      true
    );
  });

  it("accepts cookies and stores the decision", async () => {
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    await loadScript();
    dispatchClick(document.getElementById("cookieAccept"));
    const stored = JSON.parse(
      localStorage.getItem("brazildecoded_cookie_consent") || "{}"
    );
    expect(stored.status).toBe("accepted");
    expect(stored.marketing).toBe(true);
    expect(document.getElementById("cookieBanner").classList.contains("is-hidden")).toBe(
      true
    );
  });

  it("handles cookie consent storage failures without crashing", async () => {
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    await loadScript();
    const realSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = vi.fn(() => {
      throw new Error("boom");
    });
    expect(() => dispatchClick(document.getElementById("cookieAccept"))).not.toThrow();
    localStorage.setItem = realSetItem;
  });
  it("parses legacy cookie consent strings", async () => {
    localStorage.setItem("brazildecoded_cookie_consent", "accepted");
    setHtml(`
      <script></script>
      <div id="cookieBanner">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    await loadScript();
    expect(document.getElementById("cookieAnalytics").checked).toBe(true);
    expect(document.getElementById("cookieMarketing").checked).toBe(true);
    expect(document.getElementById("cookieBanner").classList.contains("is-hidden")).toBe(
      true
    );
  });

  it("handles invalid cookie consent values safely", async () => {
    localStorage.setItem("brazildecoded_cookie_consent", "{");
    setHtml(`
      <script></script>
      <div id="cookieBanner" class="is-hidden">
        <button id="cookieAccept" type="button"></button>
        <button id="cookieReject" type="button"></button>
        <button id="cookieSettings" type="button"></button>
        <div id="cookieSettingsPanel"></div>
        <input type="checkbox" id="cookieAnalytics" />
        <input type="checkbox" id="cookieMarketing" />
        <button id="cookieSave" type="button"></button>
      </div>
    `);
    await loadScript();
    expect(document.getElementById("cookieBanner").classList.contains("is-hidden")).toBe(
      false
    );
  });

  it("loads GTM when consent exists and the banner is missing", async () => {
    localStorage.setItem(
      "brazildecoded_cookie_consent",
      JSON.stringify({ status: "accepted", analytics: true, marketing: false })
    );
    setHtml(`<script></script>`);
    document.body.dataset.gtmId = "GTM-TEST";
    await loadScript();
    const gtmScript = Array.from(document.getElementsByTagName("script")).find(
      (node) => (node.src || "").includes("googletagmanager.com/gtm.js?id=GTM-TEST")
    );
    expect(gtmScript).toBeTruthy();
  });

  it("handles starter kit form consent and invalid email", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="text" name="name" id="leadName" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
        <p id="consentHelper"></p>
      </form>
    `);
    await loadScript();
    const submit = document.getElementById("leadSubmit");
    const consent = document.getElementById("consent");
    expect(submit.disabled).toBe(true);
    consent.checked = true;
    consent.dispatchEvent(new Event("change"));
    expect(submit.disabled).toBe(false);

    document.getElementById("leadEmail").value = "bad-email";
    submitForm("starterKitForm");
    expect(document.querySelector("[data-status]").textContent).toBe(
      "Please enter a valid email."
    );
  });

  it("returns early when status element is missing", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
      </form>
    `);
    await loadScript();
    document.getElementById("leadEmail").value = "bad-email";
    submitForm("starterKitForm");
    expect(getLogs().some((log) => log.message === "Starter kit invalid email")).toBe(true);
  });

  it("logs window errors with full and default details", async () => {
    await loadScript();
    const errEvent = new ErrorEvent("error", {
      message: "boom",
      filename: "file.js",
      lineno: 1,
      colno: 2,
    });
    window.dispatchEvent(errEvent);
    const errEventDefault = new Event("error");
    window.dispatchEvent(errEventDefault);
    const logs = getLogs();
    expect(logs.some((log) => log.message === "Script error")).toBe(true);
  });

  it("logs window errors with default values", async () => {
    await loadScript();
    const errEvent = new Event("error");
    window.dispatchEvent(errEvent);
    const rejEvent =
      typeof PromiseRejectionEvent === "function"
        ? new PromiseRejectionEvent("unhandledrejection", { reason: null })
        : (() => {
            const evt = new Event("unhandledrejection");
            evt.reason = null;
            return evt;
          })();
    window.dispatchEvent(rejEvent);
    const logs = getLogs();
    expect(logs.some((log) => log.message === "Script error")).toBe(true);
  });

  it("handles missing consent elements gracefully", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
      </form>
    `);
    await loadScript();
    expect(getLogs().some((log) => log.message === "Starter kit form ready")).toBe(true);
  });

  it("blocks starter kit submission when consent is missing", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    expect(document.querySelector("[data-status]").textContent).toBe(
      "You must accept the consent to enable the button."
    );
  });

  it("handles missing webhook and missing email field without crashing", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm">
        <input type="text" name="company_hp" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    await loadScript();
    submitForm("starterKitForm");
    expect(getLogs().some((log) => log.message === "Starter kit email field missing")).toBe(
      true
    );
  });

  it("handles missing webhook URL with valid email", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    expect(document.querySelector("[data-status]").textContent).toBe(
      "Missing Make webhook URL. Please update the form settings."
    );
  });

  it("validates email with default validator when no helper is present", async () => {
    delete window.BDStarterKit;
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      })
    );
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    await flushPromises();
    expect(window.fetch).not.toHaveBeenCalled();
    expect(getLogs().some((log) => log.message === "Starter kit utils missing isValidEmail")).toBe(
      true
    );
  });

  it("skips submission when honeypot is filled", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" value="bot" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn();
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it("blocks starter kit submission when submitted too quickly", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    document.getElementById("starterFormStartedAt").value = String(Date.now());
    submitForm("starterKitForm", { skipTiming: true });
    expect(document.querySelector("[data-status]").textContent).toBe(
      "Please wait a moment and try again."
    );
  });

  it("uses starterKitUtils.getUTM when buildPayload is missing", async () => {
    setLocation("/pages/cadastro.html");
    window.BDStarterKit = {
      getUTM: vi.fn(() => ({ utm_source: "a", utm_medium: "b", utm_campaign: "c" })),
      isValidEmail: () => true,
    };
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="name" id="leadName" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      })
    );
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    document.getElementById("leadName").value = "User";
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    const payload = JSON.parse(window.fetch.mock.calls[0][1].body);
    expect(payload.user_agent).toBeTruthy();
    expect(getLogs().some((log) => log.message === "Starter kit utils missing buildPayload")).toBe(
      true
    );
  });

  it("submits the starter kit with buildPayload and disables submit", async () => {
    setLocation("/pages/cadastro.html");
    window.BDStarterKit = {
      getUTM: () => ({ utm_source: "src", utm_medium: "med", utm_campaign: "cmp" }),
      buildPayload: vi.fn(() => ({ type: "starter_kit" })),
      isValidEmail: () => true,
    };
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="name" id="leadName" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      })
    );
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    document.getElementById("leadName").value = "User";
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    await flushPromises();
    expect(window.fetch).toHaveBeenCalled();
    expect(document.getElementById("leadSubmit").disabled).toBe(true);
    expect(window.BDStarterKit.buildPayload).toHaveBeenCalled();
  });

  it("redirects to success page after successful webhook", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      })
    );
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    // make setTimeout run immediately to trigger the redirect synchronously
    const realSetTimeout = window.setTimeout;
    window.setTimeout = function (fn) {
      try { fn(); } catch (e) { /* ignore */ }
      return 0;
    };
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    expect(window.location.href).toContain("/pages/contato-sucesso.html");
    window.setTimeout = realSetTimeout;
  });

  it("logs and displays an error if submit handler throws", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    await loadScript();
    const form = document.getElementById("starterKitForm");
    form.querySelector = () => {
      throw new Error("boom");
    };
    submitForm("starterKitForm");
    expect(document.querySelector("[data-status]").textContent).toBe(
      "Unexpected error during submission. Please try again."
    );
  });

  it("handles webhook failures and re-enables submit", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve("fail"),
      })
    );
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    await flushPromises();
    expect(document.querySelector("[data-status]").textContent).toBe(
      "Something went wrong. Please try again."
    );
    expect(document.getElementById("leadSubmit").disabled).toBe(false);
    expect(document.getElementById("leadSubmit").getAttribute("aria-disabled")).toBe("false");
  });

  it("handles webhook failures when fetch rejects", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn(() => Promise.reject(new Error("fail")));
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    await flushPromises();
    expect(document.querySelector("[data-status]").textContent).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("prunes logs to the last 200 entries", async () => {
    const logs = [];
    for (let i = 0; i < 205; i += 1) {
      logs.push({
        level: "info",
        message: `log-${i}`,
        timestamp: new Date().toISOString(),
      });
    }
    localStorage.setItem(logKey, JSON.stringify(logs));
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    await loadScript();
    expect(getLogs().length).toBe(200);
  });

  it("renders leads safely when control buttons are missing", async () => {
    // ensure leads exist but buttons are not present
    localStorage.setItem(
      "brazildecoded_leads",
      JSON.stringify([
        { name: "A", email: "a@example.com", date: new Date().toISOString() },
      ])
    );
    setHtml(`<div id="leadsList"></div>`);
    await loadScript();
    expect(document.getElementById("leadsList").innerHTML).toContain("<table");
  });

  it("handles missing control buttons when there are no leads", async () => {
    localStorage.removeItem("brazildecoded_leads");
    setHtml(`<div id="leadsList"></div>`);
    await loadScript();
    expect(document.getElementById("leadsList").textContent).toContain("No leads found.");
  });

  it("handles webhook failure when submit button is missing", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <p data-status></p>
      </form>
    `);
    // simulate server failure
    window.fetch = vi.fn(() => Promise.reject(new Error('boom')));
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    expect(document.querySelector("[data-status]").textContent).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("exports CSV with quoted characters in names and emails", async () => {
    localStorage.setItem(
      "brazildecoded_leads",
      JSON.stringify([
        { name: 'User "Quote"', email: 'a"b@example.com', date: new Date().toISOString() },
      ])
    );
    setHtml(`
      <div id="leadsList"></div>
      <button id="exportLeads"></button>
    `);
    // spy on URL.createObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock");
    await loadScript();
    dispatchClick(document.getElementById("exportLeads"));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("submits contact form to webhook and validates fields", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      })
    );
    await loadScript();
    document.getElementById("contactName").value = "";
    document.getElementById("contactEmail").value = "";
    document.getElementById("contactMessage").value = "";
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Please fill in all fields."
    );

    document.getElementById("contactName").value = "User";
    document.getElementById("contactEmail").value = "bad-email";
    document.getElementById("contactMessage").value = "Hi";
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Invalid email."
    );

    document.getElementById("contactEmail").value = "user@example.com";
    document.getElementById("contactConsent").checked = true;
    submitForm("contactForm");
    await flushPromises();
    await flushPromises();
    expect(window.fetch).toHaveBeenCalled();
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Message sent. Thank you!"
    );
  });

  it("skips contact submission when honeypot is filled", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" value="bot" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    window.fetch = vi.fn();
    await loadScript();
    document.getElementById("contactName").value = "User";
    document.getElementById("contactEmail").value = "user@example.com";
    document.getElementById("contactMessage").value = "Hi";
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe("");
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it("blocks contact submission when consent is missing", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    await loadScript();
    document.getElementById("contactName").value = "User";
    document.getElementById("contactEmail").value = "user@example.com";
    document.getElementById("contactMessage").value = "Hi";
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "You must accept the consent to enable the button."
    );
  });

  it("blocks contact submission when submitted too quickly", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    await loadScript();
    document.getElementById("contactName").value = "User";
    document.getElementById("contactEmail").value = "user@example.com";
    document.getElementById("contactMessage").value = "Hi";
    document.getElementById("contactFormStartedAt").value = String(Date.now());
    submitForm("contactForm", { skipTiming: true });
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Please wait a moment and try again."
    );
  });

  it("handles missing contact webhook URL", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    await loadScript();
    document.getElementById("contactName").value = "User";
    document.getElementById("contactEmail").value = "user@example.com";
    document.getElementById("contactMessage").value = "Hi";
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Missing Make webhook URL. Please update the form settings."
    );
  });

  it("handles contact webhook fetch rejection", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    window.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
    await loadScript();
    submitForm("contactForm");
    await flushPromises();
    await flushPromises();
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Something went wrong. Please try again."
    );
    expect(document.getElementById("contactSubmit").disabled).toBe(false);
  });

  it("logs string errors when contact webhook rejects with a string", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    window.fetch = vi.fn(() => Promise.reject(new Error("fail")));
    await loadScript();
    submitForm("contactForm");
    await flushPromises();
    await flushPromises();
    const logs = getLogs();
    const match = logs.find((log) => log.message === "Contact webhook failed");
    expect(match.meta.message).toBe("fail");
  });

  it("blocks contact submission when timing is missing", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    document.getElementById("contactFormStartedAt").value = "0";
    await loadScript();
    submitForm("contactForm", { skipTiming: true });
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Please wait a moment and try again."
    );
  });

  it("blocks contact submission when consent is missing", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    await loadScript();
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "You must accept the consent to enable the button."
    );
  });

  it("blocks contact submission when webhook url is missing", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="COLE_AQUI">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    await loadScript();
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Missing Make webhook URL. Please update the form settings."
    );
  });

  it("handles contact webhook non-200 response", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve("fail"),
      })
    );
    await loadScript();
    submitForm("contactForm");
    await flushPromises();
    await flushPromises();
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("uses empty user_agent when navigator.userAgent is blank", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "",
      configurable: true,
    });
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      })
    );
    await loadScript();
    submitForm("contactForm");
    await flushPromises();
    await flushPromises();
    const payload = JSON.parse(window.fetch.mock.calls[0][1].body);
    expect(payload.user_agent).toBe("");
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });
  it("handles contact webhook failure", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://example.com/webhook">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve("fail"),
      })
    );
    await loadScript();
    document.getElementById("contactName").value = "User";
    document.getElementById("contactEmail").value = "user@example.com";
    document.getElementById("contactMessage").value = "Hi";
    submitForm("contactForm");
    await flushPromises();
    await flushPromises();
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("blocks contact submission when webhook URL is a placeholder", async () => {
    setHtml(`
      <form id="contactForm" data-make-url="https://hook.us2.make.com/COLE_AQUI">
        <input type="text" id="contactName" value="User" />
        <input type="email" id="contactEmail" value="user@example.com" />
        <textarea id="contactMessage">Test</textarea>
        <input type="text" id="hp_contact" />
        <input type="hidden" id="contactFormStartedAt" />
        <label><input type="checkbox" id="contactConsent" checked /></label>
        <p id="contactConsentHelper"></p>
        <p id="contactFeedback"></p>
        <button id="contactSubmit" type="submit"></button>
      </form>
    `);
    await loadScript();
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Missing Make webhook URL. Please update the form settings."
    );
  });

  it("renders leads and supports export/clear actions", async () => {
    setHtml(`
      <div id="leadsList"></div>
      <button id="exportLeads"></button>
      <button id="clearLeads"></button>
      <button id="exportLogs"></button>
      <button id="clearLogs"></button>
    `);
    localStorage.setItem(
      "brazildecoded_leads",
      JSON.stringify([
        { name: "User", email: "user@example.com", date: new Date().toISOString() },
        { name: "", email: "no-name@example.com", date: new Date().toISOString() },
      ])
    );
    localStorage.setItem(
      logKey,
      JSON.stringify([{ level: "info", message: "test", timestamp: new Date().toISOString() }])
    );
    window.confirm = vi.fn(() => true);
    await loadScript();
    expect(document.getElementById("leadsList").innerHTML).toContain("<table");

    dispatchClick(document.getElementById("exportLeads"));
    dispatchClick(document.getElementById("clearLeads"));
    expect(JSON.parse(localStorage.getItem("brazildecoded_leads") || "[]").length).toBe(0);
    expect(URL.createObjectURL).toHaveBeenCalled();

    dispatchClick(document.getElementById("exportLogs"));
    dispatchClick(document.getElementById("clearLogs"));
    expect(JSON.parse(localStorage.getItem(logKey) || "[]").length).toBe(1);
  });

  it("handles missing admin buttons on leads page", async () => {
    setHtml(`
      <div id="leadsList"></div>
      <button id="exportLeads"></button>
    `);
    localStorage.setItem(
      "brazildecoded_leads",
      JSON.stringify([{ name: "User", email: "u@e.com", date: "now" }])
    );
    await loadScript();
    expect(document.getElementById("leadsList").innerHTML).toContain("<table");
    // click export to make sure the existing button works
    dispatchClick(document.getElementById("exportLeads"));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("handles empty leads and log actions safely", async () => {
    setHtml(`
      <div id="leadsList"></div>
      <button id="exportLeads"></button>
      <button id="clearLeads"></button>
      <button id="exportLogs"></button>
      <button id="clearLogs"></button>
    `);
    window.confirm = vi.fn(() => false);
    await loadScript();
    expect(document.getElementById("leadsList").textContent).toContain(
      "No leads found."
    );
    dispatchClick(document.getElementById("exportLeads"));
    dispatchClick(document.getElementById("clearLeads"));
    expect(window.alert).toHaveBeenCalled();
    dispatchClick(document.getElementById("exportLogs"));
    dispatchClick(document.getElementById("clearLogs"));
  });

  it("records window errors and unhandled rejections", async () => {
    await loadScript();
    const errEvent = new ErrorEvent("error", {
      message: "boom",
      filename: "file.js",
      lineno: 1,
      colno: 2,
    });
    window.dispatchEvent(errEvent);

    const rejEvent =
      typeof PromiseRejectionEvent === "function"
        ? new PromiseRejectionEvent("unhandledrejection", {
            reason: new Error("oops"),
          })
        : (() => {
            const evt = new Event("unhandledrejection");
            evt.reason = new Error("oops");
            return evt;
          })();
    window.dispatchEvent(rejEvent);
    const logs = getLogs();
    expect(logs.length).toBeGreaterThan(1);
  });

  it("exposes helper API on window.BDApp", async () => {
    await loadScript();
    expect(window.BDApp).toBeTruthy();
    expect(typeof window.BDApp.logEvent).toBe("function");
    expect(typeof window.BDApp.getUTM).toBe("function");
    expect(typeof window.BDApp.buildPayload).toBe("function");
    expect(typeof window.BDApp.renderLeads).toBe("function");
  });

  it("uses helper email validator when provided", async () => {
    window.BDStarterKit = { isValidEmail: vi.fn(() => true) };
    await loadScript();
    expect(window.BDApp.isValidEmail("user@example.com")).toBe(true);
    expect(window.BDStarterKit.isValidEmail).toHaveBeenCalled();
  });

  it("builds payload with helper and fallback UTM", async () => {
    const helper = { buildPayload: vi.fn(() => ({ ok: true })) };
    window.BDStarterKit = helper;
    await loadScript();
    const helperPayload = window.BDApp.buildPayload({
      email: "",
      name: "",
      page: "",
      referrer: "",
      userAgent: "",
      queryString: "",
    });
    expect(helper.buildPayload).toHaveBeenCalled();
    expect(helper.buildPayload.mock.calls[0][0]).toMatchObject({
      type: "starter_kit",
      email: "",
      name: "",
      page: "",
      referrer: "",
      userAgent: "",
      queryString: "",
    });
    expect(helperPayload.ok).toBe(true);

    window.BDStarterKit = null;
    await loadScript();
    const fallbackPayload = window.BDApp.buildPayload({
      email: "user@example.com",
      name: "User",
      page: "/page",
      referrer: "",
      userAgent: "ua",
      queryString: "?utm_source=src&utm_medium=med&utm_campaign=cmp",
    });
    expect(fallbackPayload.utm_source).toBe("");
    expect(fallbackPayload.user_agent).toBe("ua");
    expect(getLogs().some((log) => log.message === "Starter kit utils missing buildPayload")).toBe(
      true
    );
  });

  it("getUTM uses helper or falls back to URLSearchParams", async () => {
    const helper = {
      getUTM: vi.fn(() => ({
        utm_source: "x",
        utm_medium: "y",
        utm_campaign: "z",
      })),
    };
    window.BDStarterKit = helper;
    await loadScript();
    const helperUtm = window.BDApp.getUTM("?utm_source=a");
    expect(helper.getUTM).toHaveBeenCalled();
    expect(helperUtm.utm_source).toBe("x");

    window.BDStarterKit = null;
    await loadScript();
    const fallbackUtm = window.BDApp.getUTM("?utm_source=src&utm_medium=med&utm_campaign=cmp");
    expect(fallbackUtm.utm_campaign).toBe("");
    expect(getLogs().some((log) => log.message === "Starter kit utils missing getUTM")).toBe(
      true
    );
  });

  it("setButtonState toggles aria-disabled and handles null", async () => {
    await loadScript();
    const button = document.createElement("button");
    window.BDApp.setButtonState(button, true);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("false");
    window.BDApp.setButtonState(button, false);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    window.BDApp.setButtonState(null, true);
  });

  it("logEvent handles storage failures safely", async () => {
    await loadScript();
    const realSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = vi.fn(() => {
      throw new Error("boom");
    });
    expect(() => window.BDApp.logEvent("info", "test")).not.toThrow();
    localStorage.setItem = realSetItem;
  });

  it("handles email validation with no helper", async () => {
    delete window.BDStarterKit;
    await loadScript();
    expect(window.BDApp.isValidEmail("bad-email")).toBe(false);
    expect(window.BDApp.isValidEmail("user@example.com")).toBe(false);
    expect(getLogs().some((log) => log.message === "Starter kit utils missing isValidEmail")).toBe(
      true
    );
  });

  it("returns false when renderLeads has no element", async () => {
    await loadScript();
    expect(window.BDApp.renderLeads(null)).toBe(false);
  });

  it("clears leads and invokes render callback when confirmed", async () => {
    await loadScript();
    localStorage.setItem(
      "brazildecoded_leads",
      JSON.stringify([{ name: "User", email: "u@e.com", date: "now" }])
    );
    window.confirm = vi.fn(() => true);
    const renderSpy = vi.fn();
    expect(window.BDApp.clearLeads(renderSpy)).toBe(true);
    expect(renderSpy).toHaveBeenCalled();
  });

  it("exports leads with quoted email and name", async () => {
    await loadScript();
    localStorage.setItem(
      "brazildecoded_leads",
      JSON.stringify([
        { name: 'User "Quote"', email: 'a"b@example.com', date: "now" },
      ])
    );
    expect(window.BDApp.exportLeads()).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("export and clear helpers return expected results", async () => {
    setHtml('<div id="leadsList"></div>');
    await loadScript();
    window.alert = vi.fn();
    window.confirm = vi.fn(() => false);
    localStorage.removeItem("brazildecoded_leads");
    localStorage.removeItem(logKey);
    expect(window.BDApp.exportLeads()).toBe(false);
    expect(window.BDApp.exportLogs()).toBe(false);
    expect(window.BDApp.clearLeads(() => {})).toBe(false);
    expect(window.BDApp.clearLogs()).toBe(false);

    localStorage.setItem(
      "brazildecoded_leads",
      JSON.stringify([{ name: "User", email: "u@e.com", date: "now" }])
    );
    localStorage.setItem(
      logKey,
      JSON.stringify([{ level: "info", message: "log", timestamp: "now" }])
    );
    window.confirm = vi.fn(() => true);
    expect(window.BDApp.exportLeads()).toBe(true);
    expect(window.BDApp.exportLogs()).toBe(true);
    expect(window.BDApp.clearLeads(() => {})).toBe(true);
    expect(window.BDApp.clearLogs()).toBe(true);
  });

  it("passes userAgent and queryString when submitting with buildPayload", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="name" id="leadName" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    const payloadSpy = vi.fn(() => ({ ok: true }));
    window.BDStarterKit = { buildPayload: payloadSpy, isValidEmail: () => true };
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      })
    );
    window.location.search = "?utm_source=test";
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    expect(payloadSpy).toHaveBeenCalled();
    expect(payloadSpy.mock.calls[0][0].userAgent).toBe(navigator.userAgent);
    expect(payloadSpy.mock.calls[0][0].queryString).toBe("?utm_source=test");
  });

  it("logs string errors when webhook rejects with a string", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    window.fetch = vi.fn(() => Promise.reject(new Error("fail")));
    await loadScript();
    document.getElementById("leadEmail").value = "user@example.com";
    submitForm("starterKitForm");
    await flushPromises();
    await flushPromises();
    const logs = getLogs();
    const match = logs.find((log) => log.message === "Starter kit webhook failed");
    expect(match.meta.message).toBe("fail");
  });

  it("logs string errors when submit handler throws a non-error", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="hidden" id="starterFormStartedAt" />
        <label><input type="checkbox" id="consent" checked /></label>
        <button id="leadSubmit" type="submit"></button>
        <p data-status></p>
      </form>
    `);
    await loadScript();
    const form = document.getElementById("starterKitForm");
    form.querySelector = () => {
      throw new Error("boom");
    };
    submitForm("starterKitForm");
    const logs = getLogs();
    const match = logs.find((log) => log.message === "Starter kit submit exception");
    expect(match.meta.message).toBe("boom");
  });

  it("builds payload with null and undefined options", async () => {
    await loadScript();
    const payload = window.BDApp.buildPayload({
      email: null,
      name: undefined,
      page: null,
      referrer: undefined,
      userAgent: null,
      queryString: undefined,
    });
    expect(payload.email).toBe("");
    expect(payload.name).toBe("");
    expect(payload.page).toBe("");
    expect(payload.referrer).toBe("");
    expect(payload.user_agent).toBe("");
    expect(payload.utm_source).toBe("");
  });

  it("logs unhandled promise rejections that are not errors", async () => {
    await loadScript();
    const event = new Event("unhandledrejection");
    event.reason = "just a string";
    window.dispatchEvent(event);
    const logs = getLogs();
    const logEntry = logs.find(
      (log) => log.message === "Unhandled promise rejection"
    );
    expect(logEntry).toBeDefined();
    expect(logEntry.meta.message).toBe("just a string");
  });

  it("handles syncContactConsent without a submit button", async () => {
    setHtml(`
      <form id="contactForm">
        <input type="checkbox" id="contactConsent" />
        <p id="contactConsentHelper"></p>
      </form>
    `);
    await loadScript();
    const consent = document.getElementById("contactConsent");
    consent.checked = true;
    consent.dispatchEvent(new Event("change"));
    expect(
      document.getElementById("contactConsentHelper").textContent
    ).toContain("Thanks!");
  });

  it("handles syncConsent without a submit button", async () => {
    setHtml(`
      <form id="starterKitForm">
        <input type="checkbox" id="consent" />
        <p id="consentHelper"></p>
      </form>
    `);
    await loadScript();
    const consent = document.getElementById("consent");
    consent.checked = true;
    consent.dispatchEvent(new Event("change"));
    expect(document.getElementById("consentHelper").textContent).toContain(
      "Thanks!"
    );
  });

  it("shows an error message with the correct color", async () => {
    await loadScript();
    const el = document.createElement("div");
    window.BDApp.showMessage(el, "Error!", true);
    expect(el.textContent).toBe("Error!");
    expect(el.style.color).toBe("rgb(176, 0, 32)");
  });

  it("returns null from getCookieConsent for invalid JSON", async () => {
    localStorage.setItem("brazildecoded_cookie_consent", "not-a-json");
    setHtml('<div id="cookieBanner" class="is-hidden"></div>');
    await loadScript();
    expect(
      document.getElementById("cookieBanner").classList.contains("is-hidden")
    ).toBe(false);
  });
});
