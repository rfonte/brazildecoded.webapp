/**
 * Core BrazilDecoded page behavior.
 *
 * This module implements cookie consent, analytics loading, starter kit and
 * contact form submission, client-side validation, lead export, and local
 * logging for browser-admin pages.
 */
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
    el.classList.toggle("error", !!isError);
    el.classList.toggle("success", !isError && !!msg);
  }

  function fireGtagEvent(eventName) {
    try {
      if (typeof gtag === "function") {
        gtag("event", eventName);
      }
    } catch (err) {
      logEvent("warn", "Gtag event failed", {
        eventName: eventName,
        message: err?.message || String(err || ""),
      });
    }
  }

  function sanitizeText(value) {
    return String(value || "")
      .trim()
      .replace(/\r?\n+/g, " ")
      .replace(/\s{2,}/g, " ");
  }

  function getStarterKitUtils() {
    return globalThis.BDStarterKit || {};
  }

  const LOG_KEY = "brazildecoded_logs";
  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/v7toev6h4hvpj1akkpsrhobamwdj9hkm";
  const FORM_TOKEN = "bd_starterkit_v1";
  const STARTER_KIT_SOURCE = "free_starter_kit";
  const COOKIE_CONSENT_KEY = "brazildecoded_cookie_consent";
  const MIN_FORM_TIME_MS = 3000;

  /**
   * Loads the Google Tag Manager script only once.
   * @param {string} gtmId The GTM container ID to load.
   */
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

  /**
   * Reads cookie consent state from localStorage.
   * @returns {{status:string,analytics:boolean,marketing:boolean}|null} The saved consent state, or null when none exists.
   */
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

  /**
   * Persists cookie consent state in localStorage.
   * @param {{status:string,analytics:boolean,marketing:boolean}} value The consent state to save.
   */
  function setCookieConsent(value) {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
    } catch (err) {
      logEvent("warn", "Cookie consent storage failed", { message: err?.message ?? String(err) });
    }
  }

  /**
   * Stores a diagnostic log entry in localStorage.
   * Keeps only the latest 200 records to avoid uncontrolled local storage growth.
   * @param {string} level The log severity, like "info", "warn", or "error".
   * @param {string} message A short descriptive message.
   * @param {Object} [meta] Optional metadata attached to the log entry.
   */
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
    } catch (err) {
      console.error("logEvent failed:", err);
    }
  }

  /**
   * Enables or disables a button and keeps aria-disabled in sync.
   * @param {HTMLButtonElement|null} button The button element to update.
   * @param {boolean} enabled True to enable, false to disable.
   */
  function setButtonState(button, enabled) {
    if (!button) return;
    button.disabled = !enabled;
    button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
  }

  /**
   * Extracts UTM parameters from a query string using helper utilities.
   * Falls back to empty values if the helper is unavailable.
   * @param {string} search The location search string.
   * @returns {{utm_source:string,utm_medium:string,utm_campaign:string}}
   */
  function getUTM(search) {
    const helper = getStarterKitUtils();
    if (helper && typeof helper.getUTM === "function") {
      try {
        return helper.getUTM(search);
      } catch (err) {
        logEvent("error", "Starter kit helper getUTM failed", {
          message: err?.message || String(err || ""),
        });
      }
    }

    logEvent("warn", "Starter kit utils missing getUTM");
    return {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
    };
  }

  /**
   * Builds the request payload for starter kit submission.
   * Uses helper buildPayload if available to preserve any custom payload format.
   * @param {Object} options Form metadata and tracking values.
   */
  function buildPayload(options) {
    const helper = getStarterKitUtils();
    const payload = {
      name: sanitizeText(options.name || ""),
      email: String(options.email || "").trim().toLowerCase(),
      source: STARTER_KIT_SOURCE,
      page: options.page || "",
      form_token: FORM_TOKEN,
      referrer: options.referrer || "",
      user_agent: options.userAgent || "",
      ...getUTM(options.queryString || ""),
    };

    if (helper && typeof helper.buildPayload === "function") {
      try {
        return helper.buildPayload({
          type: "starter_kit",
          email: payload.email,
          name: payload.name,
          page: payload.page,
          referrer: payload.referrer,
          userAgent: payload.user_agent,
          queryString: options.queryString || "",
        });
      } catch (err) {
        logEvent("error", "Starter kit helper buildPayload failed", {
          message: err?.message || String(err || ""),
        });
        return payload;
      }
    }

    logEvent("warn", "Starter kit utils missing buildPayload");
    return payload;
  }

  /**
   * Validates the starter kit form before submission.
   * Performs honeypot, timing, email, consent, and webhook URL checks.
   * @param {HTMLFormElement} form The starter form element.
   * @param {HTMLElement|null} statusEl The element for status feedback.
   * @param {HTMLButtonElement|null} submitBtn The submit button element.
   * @returns {Object} Validation results including ok, email, and name.
   */
  function validateStarterForm(form, statusEl, submitBtn) {
    const honeypot =
      form.querySelector('input[name="company"]') ||
      form.querySelector('input[name="company_hp"]');
    if (honeypot?.value.trim()) {
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
    const tokenField = form.querySelector('input[name="form_token"]');
    const consent = document.getElementById("consent");
    const email = String(emailField?.value || "").trim().toLowerCase();
    const name = sanitizeText(nameField?.value || "");
    const hasFormWebhook = form.hasAttribute("data-make-url");
    const makeUrl = hasFormWebhook ? form.dataset.makeUrl : MAKE_WEBHOOK_URL;

    if (!emailField) {
      logEvent("error", "Starter kit email field missing");
      showMessage(statusEl, "Please enter your email.", true);
      return { ok: false };
    }
    if (tokenField && tokenField.value !== FORM_TOKEN) {
      logEvent("error", "Starter kit token missing or invalid");
      showMessage(statusEl, "Invalid form configuration. Please refresh the page.", true);
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
    const missingWebhook =
      !makeUrl ||
      (hasFormWebhook && makeUrl.includes("COLE_AQUI")) ||
      (!hasFormWebhook && MAKE_WEBHOOK_URL.includes("PASTE_MAKE_WEBHOOK_URL_HERE"));
    if (missingWebhook) {
      logEvent("error", "Starter kit webhook missing");
      showMessage(statusEl, "Missing Make webhook URL. Please update the form settings.", true);
      return { ok: false };
    }
    return { ok: true, email, name, makeUrl, redirectOnSuccess: hasFormWebhook };
  }

  /**
   * Sends the starter kit payload to the configured webhook endpoint.
   * Updates UI state while the request is in progress and handles success or failure.
   * @param {Object} payload The request payload to send to the Make webhook.
   * @param {HTMLElement|null} statusEl The element used to display status messages.
   * @param {HTMLButtonElement|null} submitBtn The submit button to enable/disable.
   * @param {HTMLInputElement|null} consent The consent checkbox used to decide re-enable state.
   */
  function sendStarterWebhook(payload, statusEl, submitBtn, consent) {
    showMessage(statusEl, "Sending...");
    logEvent("info", "Starter kit submit started");
    setButtonState(submitBtn, false);

    const webhookUrl = payload.makeUrl || MAKE_WEBHOOK_URL;
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        logEvent("info", "Make webhook response received", { status: res.status });
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
        showMessage(statusEl, "Thanks! Check your email for the download link.");
        fireGtagEvent("starter_kit_form_submit");
        if (payload.redirectOnSuccess) {
          setTimeout(function () {
            logEvent("info", "Redirecting to success page");
            globalThis.location.href = "/pages/contato-sucesso.html";
          }, 800);
        }
      })
      .catch(function (err) {
        logEvent("error", "Starter kit webhook failed", {
          message: err?.message ?? String(err || ""),
        });
        showMessage(statusEl, "Something went wrong. Please try again.", true);
        fireGtagEvent("starter_kit_form_error");
        setButtonState(submitBtn, !!consent?.checked);
      });
  }

  /**
   * Renders locally stored leads into an admin table.
   * @param {HTMLElement} listEl Container element where leads are displayed.
   * @returns {boolean} True when leads were found and rendered.
   */
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

  /**
   * Exports stored leads as a CSV file and triggers browser download.
   * @returns {boolean} True when export was started.
   */
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

  /**
   * Clears all saved leads from localStorage and optionally re-renders the UI.
   * @param {Function} [renderFn] Optional callback to refresh the lead display.
   * @returns {boolean} True when leads were cleared.
   */
  function clearLeads(renderFn) {
    if (!confirm("Clear all locally stored leads?")) return false;
    localStorage.removeItem("brazildecoded_leads");
    if (renderFn) {
      renderFn();
    }
    logEvent("info", "Leads cleared");
    return true;
  }

  /**
   * Exports the log history from localStorage as a JSON file.
   * @returns {boolean} True when the download was triggered.
   */
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

  /**
   * Removes all client-side log entries and records the clearing action.
   * @returns {boolean} True when logs were cleared.
   */
  function clearLogs() {
    if (!confirm("Clear all locally stored logs?")) return false;
    localStorage.removeItem(LOG_KEY);
    logEvent("info", "Logs cleared");
    return true;
  }

  // Expose helper utilities on the global BDApp object to support testing and shared behavior.
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

  // Global error handling to log unexpected browser errors and promise rejection details.
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
  /**
   * Validates the email address using helper utilities if available.
   * @param {string} email The email address to validate.
   * @returns {boolean} True when the email is valid.
   */
  function isValidEmail(email) {
    const helper = getStarterKitUtils();
    if (helper && typeof helper.isValidEmail === "function") {
      try {
        return helper.isValidEmail(email);
      } catch (err) {
        logEvent("error", "Starter kit helper isValidEmail failed", {
          message: err?.message || String(err || ""),
        });
        return false;
      }
    }
    logEvent("warn", "Starter kit utils missing isValidEmail");
    return false;
  }

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Cookie consent banner (LGPD)
  const cookieBanner = document.getElementById("cookieBanner");
  const cookieAccept = document.getElementById("cookieAccept");
  const cookieReject = document.getElementById("cookieReject");
  const cookieSettings = document.getElementById("cookieSettings");
  const cookieSave = document.getElementById("cookieSave");
  const cookieSettingsPanel = document.getElementById("cookieSettingsPanel");
  const cookieAnalytics = document.getElementById("cookieAnalytics");
  const cookieMarketing = document.getElementById("cookieMarketing");
  const gtmId = document.body?.dataset.gtmId || "";
  let consent = getCookieConsent();

  /**
   * Checks whether GTM should load based on the saved consent state.
   * @param {Object|null} consentState The stored consent details.
   * @returns {boolean} True when analytics or marketing consent is granted.
   */
  function shouldLoadGtm(consentState) {
    return (
      consentState &&
      (consentState.analytics === true || consentState.marketing === true)
    );
  }

  /**
   * Applies cookie banner visibility and loads analytics when appropriate.
   * @param {Object|null} consentState The stored consent details.
   */
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

  /**
   * Synchronizes the cookie consent input controls with the current consent state.
   * @param {Object|null} consentState The stored consent details.
   */
  function syncCookieInputs(consentState) {
    if (cookieAnalytics && consentState) {
      cookieAnalytics.checked = consentState.analytics;
    }
    if (cookieMarketing && consentState) {
      cookieMarketing.checked = consentState.marketing;
    }
  }

  /**
   * Persists a new consent state and applies it immediately.
   * @param {Object} state The new consent state.
   */
  function setConsentState(state) {
    setCookieConsent(state);
    consent = state;
    applyConsent(state);
  }

  /**
   * Toggles the cookie settings panel and updates accessibility attributes.
   */
  function toggleSettingsPanel() {
    if (!cookieSettingsPanel || !cookieSettings) return;
    const isExpanded = cookieSettingsPanel.classList.toggle("is-visible");
    cookieSettings.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    cookieSettingsPanel.setAttribute(
      "aria-hidden",
      isExpanded ? "false" : "true"
    );
    if (cookieAnalytics && !consent) cookieAnalytics.checked = false;
    if (cookieMarketing && !consent) cookieMarketing.checked = false;
  }

  /**
   * Initializes the cookie consent banner and loads analytics if consent already exists.
   */
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
          analytics: !!cookieAnalytics?.checked,
          marketing: !!cookieMarketing?.checked,
        });
      });
    }
  }

  initCookieBanner();

  /**
   * Initializes starter kit form behaviors, checkbox sync, timing, and submission.
   */
  function initStarterForm() {
    const starterForm = document.getElementById("starterKitForm");
    if (!starterForm) return;

    const submitBtn = document.getElementById("leadSubmit");
    const consent = document.getElementById("consent");
    const consentHelper = document.getElementById("consentHelper");
    const statusEl = starterForm.querySelector("[data-status]");
    const starterFormStartedAt = document.getElementById("starterFormStartedAt");
    logEvent("info", "Starter kit form ready");

    if (starterFormStartedAt) {
      starterFormStartedAt.value = String(Date.now());
    }

    const pageInput = starterForm.querySelector('input[name="page"]');
    const referrerInput = starterForm.querySelector('input[name="referrer"]');
    const userAgentInput = starterForm.querySelector('input[name="user_agent"]');
    const utmSourceInput = starterForm.querySelector('input[name="utm_source"]');
    const utmMediumInput = starterForm.querySelector('input[name="utm_medium"]');
    const utmCampaignInput = starterForm.querySelector('input[name="utm_campaign"]');
    const utmContentInput = starterForm.querySelector('input[name="utm_content"]');
    const utmTermInput = starterForm.querySelector('input[name="utm_term"]');

    if (pageInput) {
      pageInput.value = String(globalThis.location.pathname || "");
    }
    if (referrerInput) {
      referrerInput.value = document.referrer || "";
    }
    if (userAgentInput) {
      userAgentInput.value = navigator.userAgent || "";
    }

    const utm = getUTM(globalThis.location.search);
    if (utmSourceInput) utmSourceInput.value = utm.utm_source;
    if (utmMediumInput) utmMediumInput.value = utm.utm_medium;
    if (utmCampaignInput) utmCampaignInput.value = utm.utm_campaign;
    if (utmContentInput) utmContentInput.value = utm.utm_content;
    if (utmTermInput) utmTermInput.value = utm.utm_term;

    /**
     * Synchronizes the starter kit consent checkbox with the submit button state.
     */
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
          page: globalThis.location.pathname,
          referrer: document.referrer || "",
          userAgent: navigator.userAgent || "",
          queryString: globalThis.location.search,
        });
        payload.makeUrl = result.makeUrl;
        payload.redirectOnSuccess = result.redirectOnSuccess;
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

  /**
   * Initializes the contact form, including validation, consent, honeypot, and webhook submission.
   */
  function initContactForm() {
    const contactForm = document.getElementById("contactForm");
    if (!contactForm) return;

    const contactConsent = document.getElementById("contactConsent");
    const contactConsentHelper = document.getElementById("contactConsentHelper");
    const contactSubmitBtn = document.getElementById("contactSubmit");
    const contactFormStartedAt = document.getElementById("contactFormStartedAt");

    if (contactFormStartedAt) {
      contactFormStartedAt.value = String(Date.now());
    }

    /**
     * Synchronizes the contact consent checkbox state with the submit button and helper text.
     */
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
      const name = (document.getElementById("contactName").value || "").trim();
      const email = (document.getElementById("contactEmail").value || "").trim();
      const message = (
        document.getElementById("contactMessage").value || ""
      ).trim();
      const honeypot = document.getElementById("hp_contact");
      const feedback = document.getElementById("contactFeedback");
      const submitBtn = document.getElementById("contactSubmit");
      const makeUrl = contactForm.dataset.makeUrl || "";

      if (honeypot?.value) {
        logEvent("warn", "Contact blocked by honeypot");
        return; // bot
      }
      if (contactFormStartedAt) {
        const contactElapsed =
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

      const utm = getUTM(globalThis.location.search);
      const payload = {
        type: "contact",
        name: name,
        email: email,
        message: message,
        page: globalThis.location.pathname,
        referrer: document.referrer || "",
        user_agent: navigator.userAgent || "",
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
      };

      sendContactWebhook({
        makeUrl: makeUrl,
        payload: payload,
        feedback: feedback,
        submitBtn: submitBtn,
        form: contactForm,
      });
    });
  }

  /**
   * Sends the contact form payload to the configured webhook endpoint.
   * Handles success and failure with user feedback and log events.
   * @param {Object} options The contact submission options.
   */
  function sendContactWebhook(options) {
    fetch(options.makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options.payload),
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
        showMessage(options.feedback, "Message sent. Thank you!");
        options.form.reset();
      })
      .catch(function (err) {
        logEvent("error", "Contact webhook failed", {
          message: err?.message ?? String(err || ""),
        });
        showMessage(
          options.feedback,
          "Something went wrong. Please try again.",
          true
        );
        setButtonState(options.submitBtn, true);
      });
  }

  /**
   * Initializes admin controls for lead and log export/clear actions.
   */
  function initAdmin() {
    const leadsList = document.getElementById("leadsList");
    if (!leadsList) return;

    const btnExport = document.getElementById("exportLeads");
    const btnClear = document.getElementById("clearLeads");
    const btnExportLogs = document.getElementById("exportLogs");
    const btnClearLogs = document.getElementById("clearLogs");
    const renderLeadsBound = function () {
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
