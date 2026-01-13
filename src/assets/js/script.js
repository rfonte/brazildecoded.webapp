// Simple form handling for a static prototype.
(function () {
  console.warn("[starter-kit] script loaded");
  function showMessage(el, msg, isError) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "#b00020" : "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    console.warn("[starter-kit] form detected", {
      hasSubmit: !!submitBtn,
      hasConsent: !!consent,
      hasStatus: !!statusEl,
    });

    function getUTM() {
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
      console.log("[starter-kit] submit triggered");
      try {
        var honeypot = starterForm.querySelector('input[name="company_hp"]');
        console.warn(
          "[starter-kit] honeypot value",
          honeypot ? honeypot.value : null
        );
        if (honeypot && honeypot.value) {
          showMessage(
            statusEl,
            "Honeypot triggered. Please try again.",
            true
          );
          return;
        }

        console.warn("[starter-kit] after honeypot");
        var emailField = starterForm.querySelector('input[name="email"]');
        var nameField = starterForm.querySelector('input[name="name"]');
        var email = ((emailField && emailField.value) || "").trim();
        var name = ((nameField && nameField.value) || "").trim();
        var makeUrl = starterForm.getAttribute("data-make-url") || "";
        console.warn("[starter-kit] form values", {
          emailPresent: !!email,
          consentChecked: consent ? consent.checked : null,
          hasMakeUrl: !!makeUrl,
        });

        if (!emailField) {
          showMessage(
            statusEl,
            "Email field not found. Please check the form.",
            true
          );
          return;
        }

        if (!isValidEmail(email)) {
          showMessage(statusEl, "Please enter a valid email.", true);
          emailField.focus();
          return;
        }
        if (consent && !consent.checked) {
          showMessage(
            statusEl,
            "You must accept the consent to enable the button.",
            true
          );
          consent.focus();
          return;
        }
        if (!makeUrl || makeUrl.indexOf("COLE_AQUI") !== -1) {
          showMessage(
            statusEl,
            "Missing Make webhook URL. Please update the form settings.",
            true
          );
          return;
        }

        showMessage(statusEl, "Sending...");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute("aria-disabled", "true");
        }

        var payload = {
          type: "starter_kit",
          email: email,
          name: name,
          page: window.location.pathname,
          referrer: document.referrer || "",
          user_agent: navigator.userAgent || "",
        };

        var utm = getUTM();
        payload.utm_source = utm.utm_source;
        payload.utm_medium = utm.utm_medium;
        payload.utm_campaign = utm.utm_campaign;

        console.log("[starter-kit] Sending payload to Make webhook.");
        fetch(makeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            console.log("[starter-kit] Webhook response:", res.status);
            return res.text().then(function (text) {
              return { ok: res.ok, status: res.status, text: text };
            });
          })
          .then(function (result) {
            if (!result.ok) throw new Error("Request failed");
            var message =
              result.text && result.text.trim()
                ? result.text.trim()
                : "Success! Redirecting...";
            showMessage(statusEl, message);
            setTimeout(function () {
              window.location.href = "/pages/contato-sucesso.html";
            }, 800);
          })
          .catch(function (err) {
            console.error("[starter-kit] Webhook error:", err);
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
        console.error("[starter-kit] submit error:", err);
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
        return; // bot
      }
      if (!name || !email || !message) {
        showMessage(feedback, "Preencha todos os campos.", true);
        return;
      }
      if (!isValidEmail(email)) {
        showMessage(feedback, "E-mail invalido.", true);
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
      showMessage(feedback, "Mensagem enviada. Obrigado!");
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
        leadsList.innerHTML = "<p>Nenhum lead encontrado.</p>";
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
        '<table class="leads-table"><thead><tr><th>#</th><th>Nome</th><th>E-mail</th><th>Data</th></tr></thead><tbody>' +
        rows +
        "</tbody></table>";
    }

    var btnExport = document.getElementById("exportLeads");
    var btnClear = document.getElementById("clearLeads");

    if (btnExport) {
      btnExport.addEventListener("click", function () {
        var leads = JSON.parse(
          localStorage.getItem("brazildecoded_leads") || "[]"
        );
        if (!leads.length) return alert("Nenhum lead para exportar.");
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
      });
    }

    if (btnClear) {
      btnClear.addEventListener("click", function () {
        if (!confirm("Limpar todos os leads armazenados localmente?")) return;
        localStorage.removeItem("brazildecoded_leads");
        renderLeads();
      });
    }

    renderLeads();
  }
})();
