// Simple form handling for a static prototype.
(function () {
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
      // Keep the button interactive (avoid native disabled) so clicks
      // can be handled and a helpful message shown if consent is missing.
      submitBtn.classList.toggle("disabled", !consent.checked);
      submitBtn.setAttribute(
        "aria-disabled",
        !consent.checked ? "true" : "false"
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
      var honeypot = starterForm.querySelector('input[name="company"]');
      if (honeypot && honeypot.value) return;

      var email = ((starterForm.email && starterForm.email.value) || "").trim();
      var name = ((starterForm.name && starterForm.name.value) || "").trim();
      var makeUrl = starterForm.getAttribute("data-make-url") || "";

      if (!isValidEmail(email)) {
        showMessage(statusEl, "Please enter a valid email.", true);
        if (starterForm.email) starterForm.email.focus();
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

      fetch(makeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed");
          window.location.href = "/pages/thank-you.html";
        })
        .catch(function () {
          showMessage(
            statusEl,
            "Something went wrong. Please try again.",
            true
          );
        });
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
