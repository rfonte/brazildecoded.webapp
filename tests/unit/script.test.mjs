import { describe, it, expect, beforeEach, vi } from "vitest";

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

function submitForm(formId) {
  const form = document.getElementById(formId);
  form.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );
}

function dispatchClick(el) {
  el.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function stubUrlHelpers() {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => "blob:mock");
  } else if (!vi.isMockFunction(URL.createObjectURL)) {
    URL.createObjectURL = vi.fn(() => "blob:mock");
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  } else if (!vi.isMockFunction(URL.revokeObjectURL)) {
    URL.revokeObjectURL = vi.fn();
  }
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
  delete window.BDStarterKit;
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

  it("handles starter kit form consent and invalid email", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
        <input type="text" name="name" id="leadName" />
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

  it("validates email with default regex when no helper is present", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" />
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
    expect(window.fetch).toHaveBeenCalled();
  });

  it("skips submission when honeypot is filled", async () => {
    setLocation("/pages/cadastro.html");
    setHtml(`
      <form id="starterKitForm" data-make-url="https://example.com/webhook">
        <input type="email" name="email" id="leadEmail" />
        <input type="text" name="company_hp" value="bot" />
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
    expect(window.BDStarterKit.getUTM).toHaveBeenCalled();
    const payload = JSON.parse(window.fetch.mock.calls[0][1].body);
    expect(payload.user_agent).toBeTruthy();
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

  it("stores contact messages locally and validates fields", async () => {
    setHtml(`
      <form id="contactForm">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" />
        <p id="contactFeedback"></p>
      </form>
    `);
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
    submitForm("contactForm");
    const stored = JSON.parse(
      localStorage.getItem("brazildecoded_contacts") || "[]"
    );
    expect(stored.length).toBe(1);
    expect(document.getElementById("contactFeedback").textContent).toBe(
      "Message sent. Thank you!"
    );
  });

  it("skips contact submission when honeypot is filled", async () => {
    setHtml(`
      <form id="contactForm">
        <input type="text" id="contactName" />
        <input type="email" id="contactEmail" />
        <textarea id="contactMessage"></textarea>
        <input type="text" id="hp_contact" value="bot" />
        <p id="contactFeedback"></p>
      </form>
    `);
    await loadScript();
    document.getElementById("contactName").value = "User";
    document.getElementById("contactEmail").value = "user@example.com";
    document.getElementById("contactMessage").value = "Hi";
    submitForm("contactForm");
    expect(document.getElementById("contactFeedback").textContent).toBe("");
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
});
