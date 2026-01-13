// Simple form handling for a static prototype.
(function () {
  function showMessage(el, msg, isError) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "#b00020" : "";
  }

  var starterKitUtils = window.BDStarterKit || {};
  var LOG_KEY = "brazildecoded_logs";

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
    } catch (err) {
      // Do not throw while logging.
    }
  }

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

  // Starter kit form (Make webhook)
  var starterForm = document.getElementById("starterKitForm");
  if (starterForm) {
    var submitBtn = document.getElementById("leadSubmit");
    var consent = document.getElementById("consent");
    var consentHelper = document.getElementById("consentHelper");
    var statusEl = starterForm.querySelector("[data-status]");
    logEvent("info", "Starter kit form ready");

    function getUTM() {
      if (starterKitUtils.getUTM) {
        return starterKitUtils.getUTM(window.location.search);
      }
      var params = new URLSearchParams(window.location.search);
      return {
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
      };
    }

    function syncConsent() {
      if (!submitBtn || !consent) return;
      submitBtn.disabled = !consent.checked;
      submitBtn.setAttribute(
        "aria-disabled",
        submitBtn.disabled ? "true" : "false"
      );
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
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute("aria-disabled", "true");
        }

        var payload = starterKitUtils.buildPayload
          ? starterKitUtils.buildPayload({
              type: "starter_kit",
              email: email,
              name: name,
              page: window.location.pathname,
              referrer: document.referrer || "",
              userAgent: navigator.userAgent || "",
              queryString: window.location.search,
            })
          : (function () {
              var utm = getUTM();
              return {
                type: "starter_kit",
                email: email,
                name: name,
                page: window.location.pathname,
                referrer: document.referrer || "",
                user_agent: navigator.userAgent || "",
                utm_source: utm.utm_source,
                utm_medium: utm.utm_medium,
                utm_campaign: utm.utm_campaign,
              };
            })();

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
            if (submitBtn) {
              submitBtn.disabled = !consent || !consent.checked;
              submitBtn.setAttribute(
                "aria-disabled",
                submitBtn.disabled ? "true" : "false"
              );
            }
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

      var contacts = JSON.parse(
        localStorage.getItem("brazildecoded_contacts") || "[]"
      );
      contacts.push({
        name: name,
        email: email,
        message: message,
        date: new Date().toISOString(),
      });
      localStorage.setItem("brazildecoded_contacts", JSON.stringify(contacts));
      logEvent("info", "Contact stored locally");
      showMessage(feedback, "Message sent. Thank you!");
      contactForm.reset();
    });
  }

  // Admin: leads viewer (leads.html)
  var leadsList = document.getElementById("leadsList");
  if (leadsList) {
    function renderLeads() {
      var leads = JSON.parse(
        localStorage.getItem("brazildecoded_leads") || "[]"
      );
      if (!leads.length) {
        leadsList.innerHTML = "<p>No leads found.</p>";
        return;
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
      leadsList.innerHTML =
        '<table class="leads-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table>";
    }

    var btnExport = document.getElementById("exportLeads");
    var btnClear = document.getElementById("clearLeads");
    var btnExportLogs = document.getElementById("exportLogs");
    var btnClearLogs = document.getElementById("clearLogs");

    if (btnExport) {
      btnExport.addEventListener("click", function () {
        var leads = JSON.parse(
          localStorage.getItem("brazildecoded_leads") || "[]"
        );
        if (!leads.length) return alert("No leads to export.");
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
      });
    }

    if (btnClear) {
      btnClear.addEventListener("click", function () {
        if (!confirm("Clear all locally stored leads?")) return;
        localStorage.removeItem("brazildecoded_leads");
        renderLeads();
        logEvent("info", "Leads cleared");
      });
    }

    if (btnExportLogs) {
      btnExportLogs.addEventListener("click", function () {
        var logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
        if (!logs.length) return alert("No logs to export.");
        var blob = new Blob([JSON.stringify(logs, null, 2)], {
          type: "application/json;charset=utf-8;",
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "brazildecoded_logs.json";
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (btnClearLogs) {
      btnClearLogs.addEventListener("click", function () {
        if (!confirm("Clear all locally stored logs?")) return;
        localStorage.removeItem(LOG_KEY);
        logEvent("info", "Logs cleared");
      });
    }

    renderLeads();
  }
})();
