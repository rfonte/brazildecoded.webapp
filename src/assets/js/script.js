// Simple form handling for a static prototype.
(function () {
  var app = window.BDApp || {};
  window.BDApp = app;

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

  var starterKitUtils = window.BDStarterKit || {};
  var LOG_KEY = "brazildecoded_logs";
  var COOKIE_CONSENT_KEY = "brazildecoded_cookie_consent";

  function loadGtm(gtmId) {
    if (!gtmId || window.__bdGtmLoaded) return;
    window.__bdGtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = document.getElementsByTagName("script")[0];
    var j = document.createElement("script");
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + gtmId;
    f.parentNode.insertBefore(j, f);
  }

  function getCookieConsent() {
    try {
      var raw = localStorage.getItem(COOKIE_CONSENT_KEY) || "";
      if (!raw) return null;
      if (raw === "accepted" || raw === "rejected") {
        return {
          status: raw,
          analytics: raw === "accepted",
          marketing: raw === "accepted",
        };
      }
      var parsed = JSON.parse(raw);
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
      var existing = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      var entry = {
        level: level,
        message: message,
        meta: meta || {},
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      };
      existing.push(entry);
      if (existing.length > 200) {
        existing = existing.slice(existing.length - 200);
      }
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
    var helper = utils || starterKitUtils;
    if (helper.getUTM) {
      return helper.getUTM(search);
    }
    var params = new URLSearchParams(search || "");
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
    };
  }

  function buildPayload(options) {
    var helper = options.utils || starterKitUtils;
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
    var utm = getUTM(options.queryString || "", helper);
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

  function renderLeads(listEl) {
    if (!listEl) return false;
    var leads = JSON.parse(
      localStorage.getItem("brazildecoded_leads") || "[]"
    );
    if (!leads.length) {
      listEl.innerHTML = "<p>No leads found.</p>";
      return false;
    }
    var rows = leads
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
    var leads = JSON.parse(localStorage.getItem("brazildecoded_leads") || "[]");
    if (!leads.length) {
      alert("No leads to export.");
      return false;
    }
    var csv =
      "name,email,date\n" +
      leads
        .map(function (l) {
          var name = (l.name || "").replace(/"/g, '""');
          var email = (l.email || "").replace(/"/g, '""');
          return '"' + name + '","' + email + '",' + l.date;
        })
        .join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
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
    var logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    if (!logs.length) {
      alert("No logs to export.");
      return false;
    }
    var blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
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

  window.addEventListener("error", function (event) {
    logEvent("error", event.message || "Script error", {
      filename: event.filename || "",
      lineno: event.lineno || 0,
      colno: event.colno || 0,
    });
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    logEvent("error", "Unhandled promise rejection", {
      message:
        reason && reason.message ? reason.message : String(reason || ""),
    });
  });
  function isValidEmail(email) {
    if (starterKitUtils.isValidEmail) {
      return starterKitUtils.isValidEmail(email);
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
  }

  var yearEl = document.getElementById("year");
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

  if (cookieBanner) {
    applyConsent(consent);

    if (cookieAnalytics && consent) {
      cookieAnalytics.checked = consent.analytics;
    }
    if (cookieMarketing && consent) {
      cookieMarketing.checked = consent.marketing;
    }

    if (cookieAccept) {
      cookieAccept.addEventListener("click", function () {
        var state = { status: "accepted", analytics: true, marketing: true };
        setCookieConsent(state);
        consent = state;
        applyConsent(state);
      });
    }

    if (cookieReject) {
      cookieReject.addEventListener("click", function () {
        var state = { status: "rejected", analytics: false, marketing: false };
        setCookieConsent(state);
        consent = state;
        applyConsent(state);
      });
    }

    if (cookieSettings && cookieSettingsPanel) {
      cookieSettings.addEventListener("click", function () {
        var isExpanded = cookieSettingsPanel.classList.toggle("is-visible");
        cookieSettings.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        cookieSettingsPanel.setAttribute(
          "aria-hidden",
          isExpanded ? "false" : "true"
        );
        if (cookieAnalytics && !consent) cookieAnalytics.checked = false;
        if (cookieMarketing && !consent) cookieMarketing.checked = false;
      });
    }

    if (cookieSave) {
      cookieSave.addEventListener("click", function () {
        var state = {
          status: "custom",
          analytics: !!(cookieAnalytics && cookieAnalytics.checked),
          marketing: !!(cookieMarketing && cookieMarketing.checked),
        };
        setCookieConsent(state);
        consent = state;
        applyConsent(state);
      });
    }
  } else if (consent && shouldLoadGtm(consent)) {
    loadGtm(gtmId);
  }

  // Starter kit form (Make webhook)
  var starterForm = document.getElementById("starterKitForm");
  if (starterForm) {
    var submitBtn = document.getElementById("leadSubmit");
    var consent = document.getElementById("consent");
    var consentHelper = document.getElementById("consentHelper");
    var statusEl = starterForm.querySelector("[data-status]");
    logEvent("info", "Starter kit form ready");

    function syncConsent() {
      if (!submitBtn || !consent) return;
      setButtonState(submitBtn, consent.checked);
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
        var honeypot = starterForm.querySelector('input[name="company_hp"]');
        if (honeypot && honeypot.value) {
          logEvent("warn", "Starter kit blocked by honeypot");
          return;
        }

        var emailField = starterForm.querySelector('input[name="email"]');
        var nameField = starterForm.querySelector('input[name="name"]');
        var email = ((emailField && emailField.value) || "").trim();
        var name = ((nameField && nameField.value) || "").trim();
        var makeUrl = starterForm.getAttribute("data-make-url") || "";

        if (!emailField) {
          logEvent("error", "Starter kit email field missing");
          return;
        }

        if (!isValidEmail(email)) {
          logEvent("warn", "Starter kit invalid email", { email: email });
          showMessage(statusEl, "Please enter a valid email.", true);
          emailField.focus();
          return;
        }
        if (consent && !consent.checked) {
          logEvent("warn", "Starter kit missing consent");
          showMessage(
            statusEl,
            "You must accept the consent to enable the button.",
            true
          );
          consent.focus();
          return;
        }
        if (!makeUrl || makeUrl.indexOf("COLE_AQUI") !== -1) {
          logEvent("error", "Starter kit webhook missing");
          showMessage(
            statusEl,
            "Missing Make webhook URL. Please update the form settings.",
            true
          );
          return;
        }

        showMessage(statusEl, "Sending...");
        logEvent("info", "Starter kit submit started");
        setButtonState(submitBtn, false);

        var payload = buildPayload({
          email: email,
          name: name,
          page: window.location.pathname,
          referrer: document.referrer || "",
          userAgent: navigator.userAgent || "",
          queryString: window.location.search,
          utils: starterKitUtils,
        });

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
            logEvent("info", "Starter kit webhook success", {
              status: result.status,
            });
            showMessage(statusEl, "Sending...");
            setTimeout(function () {
              window.location.href = "/pages/contato-sucesso.html";
            }, 800);
          })
          .catch(function (err) {
            logEvent("error", "Starter kit webhook failed", {
              message: err && err.message ? err.message : String(err || ""),
            });
            showMessage(
              statusEl,
              "Something went wrong. Please try again.",
              true
            );
            setButtonState(submitBtn, consent && consent.checked);
          });
      } catch (err) {
        logEvent("error", "Starter kit submit exception", {
          message: err && err.message ? err.message : String(err || ""),
        });
        showMessage(
          statusEl,
          "Unexpected error during submission. Please try again.",
          true
        );
      }
    });
  }

  // Contact form
  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
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
      var makeUrl = contactForm.getAttribute("data-make-url") || "";

      if (honeypot && honeypot.value) {
        logEvent("warn", "Contact blocked by honeypot");
        return; // bot
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
      if (!makeUrl || makeUrl.indexOf("COLE_AQUI") !== -1) {
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
            message: err && err.message ? err.message : String(err || ""),
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

  // Admin: leads viewer (leads.html)
  var leadsList = document.getElementById("leadsList");
  if (leadsList) {
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
})();
