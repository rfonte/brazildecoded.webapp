// Simple form handling for a static prototype.
(function () {
  const app = globalThis.BDApp || {};
  globalThis.BDApp = app;

  /**
   * Displays a message to the user in a specified element.
   * @param {HTMLElement} el The element to display the message in.
   * @param {string} msg The message to display.
   * @param {boolean} [isError=false] Whether the message is an error, which affects the text color.
   */
  function showMessage(el, msg, isError) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "#b00020" : "";
  }

  const starterKitUtils = globalThis.BDStarterKit || {};
  const LOG_KEY = "brazildecoded_logs";
  const COOKIE_CONSENT_KEY = "brazildecoded_cookie_consent";
  const MIN_FORM_TIME_MS = 3000;

  function loadGtm(gtmId) {
    if (!gtmId || globalThis.__bdGtmLoaded) return;
    // Validate gtmId to ensure it's safe for URL construction
    if (typeof gtmId !== "string" || !/^[A-Z0-9-]+$/i.test(gtmId)) {
      logEvent("error", "Invalid GTM ID", { gtmId });
      return;
    }
    globalThis.__bdGtmLoaded = true;
    globalThis.dataLayer = globalThis.dataLayer || [];
    globalThis.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const f = document.getElementsByTagName("script")[0];
    const j = document.createElement("script");
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(gtmId);
    f.parentNode.insertBefore(j, f);
  }

  function getCookieConsent() {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_KEY) || "";
      if (!raw) return null;
      if (raw === "accepted" || raw === "rejected") {
        return {
          status: raw,
          analytics: raw === "accepted",
          marketing: raw === "accepted",
        };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        status: parsed.status || "custom",
        analytics: !!parsed.analytics,
        marketing: !!parsed.marketing,
      };
    } catch {
      return null;
    }
  }

  function setCookieConsent(value) {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
    } catch {
      // Ignore storage failures.
    }
  }

  function logEvent(level, message, meta) {
    try {
      const existing = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      const entry = {
        level: level,
        message: message,
        meta: meta || {},
        page: globalThis.location.pathname,
        timestamp: new Date().toISOString(),
      };
      existing.push(entry);
      existing.splice(0, existing.length - 200);
      localStorage.setItem(LOG_KEY, JSON.stringify(existing));
    } catch {
      // Do not throw while logging.
    }
  }

  function setButtonState(button, enabled) {
    if (!button) return;
    button.disabled = !enabled;
    button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
  }

  function getUTM(search, utils) {
    const helper = utils || starterKitUtils;
    if (helper.getUTM) {
      return helper.getUTM(search);
    }
    const params = new URLSearchParams(search || "");
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
    };
  }

  function buildPayload(options) {
    const helper = options.utils || starterKitUtils;
    if (helper.buildPayload) {
      return helper.buildPayload({
        type: "starter_kit",
        email: options.email || "",
        name: options.name || "",
        page: options.page || "",
        referrer: options.referrer || "",
        userAgent: options.userAgent || "",
        queryString: options.queryString || "",
      });
    }
    const utm = getUTM(options.queryString || "", helper);
    return {
      type: "starter_kit",
      email: options.email || "",
      name: options.name || "",
      page: options.page || "",
      referrer: options.referrer || "",
      user_agent: options.userAgent || "",
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
    };
  }

  function validateStarterForm(form, statusEl, submitBtn) {
    const honeypot = form.querySelector('input[name="company_hp"]');
    if (honeypot?.value) {
      logEvent("warn", "Starter kit blocked by honeypot");
      return { ok: false };
    }
    const starterFormStartedAt = document.getElementById("starterFormStartedAt");
    if (starterFormStartedAt) {
      const elapsed = Date.now() - Number(starterFormStartedAt.value || 0);
      if (!elapsed || elapsed < MIN_FORM_TIME_MS) {
        logEvent("warn", "Starter kit blocked by timing");
        showMessage(statusEl, "Please wait a moment and try again.", true);
        return { ok: false };
      }
    }
    const emailField = form.querySelector('input[name="email"]');
    const nameField = form.querySelector('input[name="name"]');
    const consent = document.getElementById("consent");
    const email = (emailField?.value || "").trim();
    const name = (nameField?.value || "").trim();
    const makeUrl = form.dataset.makeUrl || "";

    if (!emailField) {
      logEvent("error", "Starter kit email field missing");
      return { ok: false };
    }

    if (!isValidEmail(email)) {
      logEvent("warn", "Starter kit invalid email", { email: email });
      showMessage(statusEl, "Please enter a valid email.", true);
      emailField.focus();
      return { ok: false };
    }
    if (!consent?.checked) {
      logEvent("warn", "Starter kit missing consent");
      showMessage(statusEl, "You must accept the consent to enable the button.", true);
      consent?.focus();
      return { ok: false };
    }
    if (!makeUrl || makeUrl.includes("COLE_AQUI")) {
      logEvent("error", "Starter kit webhook missing");
      showMessage(statusEl, "Missing Make webhook URL. Please update the form settings.", true);
      return { ok: false };
    }
    return { ok: true, email, name, makeUrl };
  }

  function sendStarterWebhook(payload, statusEl, submitBtn, consent) {
    showMessage(statusEl, "Sending...");
    logEvent("info", "Starter kit submit started");
    setButtonState(submitBtn, false);

    logEvent("info", "Fetching Make webhook");
    fetch(payload.makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        logEvent("info", "Make webhook response received");
        return res.text().then(function (text) {
          return { ok: res.ok, status: res.status, text: text };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          logEvent("error", "Make webhook returned an error", result);
          throw new Error("Request failed");
        }
        logEvent("info", "Starter kit webhook success", { status: result.status });
        showMessage(statusEl, "Sending...");
        setTimeout(function () {
          logEvent("info", "Redirecting to success page");
          globalThis.location.href = "/pages/contato-sucesso.html";
        }, 800);
      })
      .catch(function (err) {
        logEvent("error", "Starter kit webhook failed", {
          message: err?.message ?? String(err || ""),
        });
        showMessage(statusEl, "Something went wrong. Please try again.", true);
        setButtonState(submitBtn, !!consent?.checked);
      });
  }

  function renderLeads(listEl) {
    if (!listEl) return false;
    const leads = JSON.parse(
      localStorage.getItem("brazildecoded_leads") || "[]"
    );
    if (!leads.length) {
      listEl.innerHTML = "<p>No leads found.</p>";
      return false;
    }
    const rows = leads
      .map(function (l, i) {
        return (
          "<tr><td>" +
          (i + 1) +
          "</td><td>" +
          (l.name || "-") +
          "</td><td>" +
          l.email +
          "</td><td>" +
          new Date(l.date).toLocaleString() +
          "</td></tr>"
        );
      })
      .join("");
    listEl.innerHTML =
      '<table class="leads-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Date</th></tr></thead><tbody>' +
      rows +
      "</tbody></table>";
    return true;
  }

  function exportLeads() {
    const leads = JSON.parse(localStorage.getItem("brazildecoded_leads") || "[]");
    if (!leads.length) {
      alert("No leads to export.");
      return false;
    }
    const csv =
      "name,email,date\n" +
      leads
        .map(function (l) {
          const name = (l.name || "").replaceAll('"', '""');
          const email = (l.email || "").replaceAll('"', '""');
          return '"' + name + '","' + email + '",' + l.date;
        })
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brazildecoded_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    logEvent("info", "Leads exported");
    return true;
  }

  function clearLeads(renderFn) {
    if (!confirm("Clear all locally stored leads?")) return false;
    localStorage.removeItem("brazildecoded_leads");
    if (renderFn) {
      renderFn();
    }
    logEvent("info", "Leads cleared");
    return true;
  }

  function exportLogs() {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    if (!logs.length) {
      alert("No logs to export.");
      return false;
    }
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brazildecoded_logs.json";
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function clearLogs() {
    if (!confirm("Clear all locally stored logs?")) return false;
    localStorage.removeItem(LOG_KEY);
    logEvent("info", "Logs cleared");
    return true;
  }

  app.showMessage = showMessage;
  app.logEvent = logEvent;
  app.isValidEmail = isValidEmail;
  app.getUTM = getUTM;
  app.buildPayload = buildPayload;
  app.setButtonState = setButtonState;
  app.renderLeads = renderLeads;
  app.exportLeads = exportLeads;
  app.clearLeads = clearLeads;
  app.exportLogs = exportLogs;
  app.clearLogs = clearLogs;
  app.LOG_KEY = LOG_KEY;

  globalThis.addEventListener("error", function (event) {
    logEvent("error", event.message || "Script error", {
      filename: event.filename || "",
      lineno: event.lineno || 0,
      colno: event.colno || 0,
    });
  });

  globalThis.addEventListener("unhandledrejection", function (event) {
    const reason = event.reason;
    logEvent("error", "Unhandled promise rejection", {
      message: reason?.message ?? String(reason || ""),
    });
  });
  function isValidEmail(email) {
    if (starterKitUtils?.isValidEmail) {
      return starterKitUtils.isValidEmail(email);
    }
    const value = (email || "").trim();
    if (!value || value.length > 254) return false;
    if (value.includes(" ")) return false;
    const atIndex = value.indexOf("@");
    if (atIndex <= 0) return false;
    if (value.includes("@", atIndex + 1)) return false;
    const domain = value.slice(atIndex + 1);
    if (!domain?.includes(".")) return false;
    if (domain?.startsWith(".") || domain?.endsWith(".")) return false;
    return true;
  }

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Cookie consent banner (LGPD)
  var cookieBanner = document.getElementById("cookieBanner");
  var cookieAccept = document.getElementById("cookieAccept");
  var cookieReject = document.getElementById("cookieReject");
  var cookieSettings = document.getElementById("cookieSettings");
  var cookieSave = document.getElementById("cookieSave");
  var cookieSettingsPanel = document.getElementById("cookieSettingsPanel");
  var cookieAnalytics = document.getElementById("cookieAnalytics");
  var cookieMarketing = document.getElementById("cookieMarketing");
  var gtmId = document.body ? document.body.getAttribute("data-gtm-id") : "";
  var consent = getCookieConsent();

  function shouldLoadGtm(consentState) {
    return (
      consentState &&
      (consentState.analytics === true || consentState.marketing === true)
    );
  }

  function applyConsent(consentState) {
    if (!cookieBanner) return;
    if (!consentState) {
      cookieBanner.classList.remove("is-hidden");
      return;
    }
    cookieBanner.classList.add("is-hidden");
    if (shouldLoadGtm(consentState)) {
      loadGtm(gtmId);
    }
  }

  function syncCookieInputs(consentState) {
    if (cookieAnalytics && consentState) {
      cookieAnalytics.checked = consentState.analytics;
    }
    if (cookieMarketing && consentState) {
      cookieMarketing.checked = consentState.marketing;
    }
  }

  function setConsentState(state) {
    setCookieConsent(state);
    consent = state;
    applyConsent(state);
  }

  function toggleSettingsPanel() {
    if (!cookieSettingsPanel || !cookieSettings) return;
    var isExpanded = cookieSettingsPanel.classList.toggle("is-visible");
    cookieSettings.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    cookieSettingsPanel.setAttribute(
      "aria-hidden",
      isExpanded ? "false" : "true"
    );
    if (cookieAnalytics && !consent) cookieAnalytics.checked = false;
    if (cookieMarketing && !consent) cookieMarketing.checked = false;
  }

  function initCookieBanner() {
    if (!cookieBanner) {
      if (consent && shouldLoadGtm(consent)) {
        loadGtm(gtmId);
      }
      return;
    }

    applyConsent(consent);
    syncCookieInputs(consent);

    if (cookieAccept) {
      cookieAccept.addEventListener("click", function () {
        setConsentState({ status: "accepted", analytics: true, marketing: true });
      });
    }

    if (cookieReject) {
      cookieReject.addEventListener("click", function () {
        setConsentState({ status: "rejected", analytics: false, marketing: false });
      });
    }

    if (cookieSettings && cookieSettingsPanel) {
      cookieSettings.addEventListener("click", toggleSettingsPanel);
    }

    if (cookieSave) {
      cookieSave.addEventListener("click", function () {
        setConsentState({
          status: "custom",
          analytics: !!(cookieAnalytics && cookieAnalytics.checked),
          marketing: !!(cookieMarketing && cookieMarketing.checked),
        });
      });
    }
  }

  initCookieBanner();

  function initStarterForm() {
    var starterForm = document.getElementById("starterKitForm");
    if (!starterForm) return;

    var submitBtn = document.getElementById("leadSubmit");
    var consent = document.getElementById("consent");
    var consentHelper = document.getElementById("consentHelper");
    var statusEl = starterForm.querySelector("[data-status]");
    var starterFormStartedAt = document.getElementById("starterFormStartedAt");
    logEvent("info", "Starter kit form ready");

    if (starterFormStartedAt) {
      starterFormStartedAt.value = String(Date.now());
    }

    function syncConsent() {
      if (!consent) return;
      if (submitBtn) {
        setButtonState(submitBtn, consent.checked);
      }
      if (consentHelper) {
        consentHelper.textContent = consent.checked
          ? "Thanks! You can submit the form now."
          : "You must accept the consent to enable the button.";
      }
    }

    if (consent) {
      consent.addEventListener("change", syncConsent);
    }
    syncConsent();

    starterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      try {
        const result = validateStarterForm(starterForm, statusEl, submitBtn);
        if (!result.ok) return;

        const payload = buildPayload({
          email: result.email,
          name: result.name,
          page: window.location.pathname,
          referrer: document.referrer || "",
          userAgent: navigator.userAgent || "",
          queryString: window.location.search,
          utils: starterKitUtils,
        });
        payload.makeUrl = result.makeUrl;
        sendStarterWebhook(payload, statusEl, submitBtn, consent);
      } catch (err) {
        logEvent("error", "Starter kit submit exception", {
          message: err?.message ? err.message : String(err || ""),
        });
        showMessage(
          statusEl,
          "Unexpected error during submission. Please try again.",
          true
        );
      }
    });
  }

  function initContactForm() {
    var contactForm = document.getElementById("contactForm");
    if (!contactForm) return;

    var contactConsent = document.getElementById("contactConsent");
    var contactConsentHelper = document.getElementById("contactConsentHelper");
    var contactSubmitBtn = document.getElementById("contactSubmit");
    var contactFormStartedAt = document.getElementById("contactFormStartedAt");

    if (contactFormStartedAt) {
      contactFormStartedAt.value = String(Date.now());
    }

    function syncContactConsent() {
      if (!contactConsent) return;
      if (contactSubmitBtn) {
        setButtonState(contactSubmitBtn, contactConsent.checked);
      }
      if (contactConsentHelper) {
        contactConsentHelper.textContent = contactConsent.checked
          ? "Thanks! You can submit the form now."
          : "You must accept the consent to enable the button.";
      }
    }

    if (contactConsent) {
      contactConsent.addEventListener("change", syncContactConsent);
    }
    syncContactConsent();

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("contactName").value || "").trim();
      var email = (document.getElementById("contactEmail").value || "").trim();
      var message = (
        document.getElementById("contactMessage").value || ""
      ).trim();
      var honeypot = document.getElementById("hp_contact");
      var feedback = document.getElementById("contactFeedback");
      var submitBtn = document.getElementById("contactSubmit");
      var makeUrl = contactForm.dataset.makeUrl || "";

      if (honeypot?.value) {
        logEvent("warn", "Contact blocked by honeypot");
        return; // bot
      }
      if (contactFormStartedAt) {
        var contactElapsed =
          Date.now() - Number(contactFormStartedAt.value || 0);
        if (!contactElapsed || contactElapsed < MIN_FORM_TIME_MS) {
          logEvent("warn", "Contact blocked by timing");
          showMessage(
            feedback,
            "Please wait a moment and try again.",
            true
          );
          return;
        }
      }
      if (!name || !email || !message) {
        logEvent("warn", "Contact missing fields");
        showMessage(feedback, "Please fill in all fields.", true);
        return;
      }
      if (!isValidEmail(email)) {
        logEvent("warn", "Contact invalid email", { email: email });
        showMessage(feedback, "Invalid email.", true);
        return;
      }
      if (!contactConsent?.checked) {
        logEvent("warn", "Contact missing consent");
        showMessage(
          feedback,
          "You must accept the consent to enable the button.",
          true
        );
        contactConsent?.focus();
        return;
      }
      if (!makeUrl || makeUrl.includes("COLE_AQUI")) {
        logEvent("error", "Contact webhook missing");
        showMessage(
          feedback,
          "Missing Make webhook URL. Please update the form settings.",
          true
        );
        return;
      }

      showMessage(feedback, "Sending...");
      setButtonState(submitBtn, false);

      var utm = getUTM(window.location.search, starterKitUtils);
      var payload = {
        type: "contact",
        name: name,
        email: email,
        message: message,
        page: window.location.pathname,
        referrer: document.referrer || "",
        user_agent: navigator.userAgent || "",
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
      };

      fetch(makeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.text().then(function (text) {
            return { ok: res.ok, status: res.status, text: text };
          });
        })
        .then(function (result) {
          if (!result.ok) throw new Error("Request failed");
          logEvent("info", "Contact webhook success", {
            status: result.status,
          });
          showMessage(feedback, "Message sent. Thank you!");
          contactForm.reset();
        })
        .catch(function (err) {
          logEvent("error", "Contact webhook failed", {
            message: err?.message ? err.message : String(err || ""),
          });
          showMessage(
            feedback,
            "Something went wrong. Please try again.",
            true
          );
          setButtonState(submitBtn, true);
        });
    });
  }

  function initAdmin() {
    var leadsList = document.getElementById("leadsList");
    if (!leadsList) return;

    var btnExport = document.getElementById("exportLeads");
    var btnClear = document.getElementById("clearLeads");
    var btnExportLogs = document.getElementById("exportLogs");
    var btnClearLogs = document.getElementById("clearLogs");
    var renderLeadsBound = function () {
      return renderLeads(leadsList);
    };

    if (btnExport) {
      btnExport.addEventListener("click", exportLeads);
    }

    if (btnClear) {
      btnClear.addEventListener("click", function () {
        clearLeads(renderLeadsBound);
      });
    }

    if (btnExportLogs) {
      btnExportLogs.addEventListener("click", exportLogs);
    }

    if (btnClearLogs) {
      btnClearLogs.addEventListener("click", function () {
        clearLogs();
      });
    }

    renderLeads(leadsList);
  }

  initStarterForm();
  initContactForm();
  initAdmin();
})();
