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

  // Lead capture (cadastro)
  var leadForm = document.getElementById("leadForm");
  if (leadForm) {
    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameEl = document.getElementById("leadName");
      var emailEl = document.getElementById("leadEmail");
      var honeypot = document.getElementById("hp_lead");
      var consent = document.getElementById("consent");
      var name = ((nameEl && nameEl.value) || "").trim();
      var email = ((emailEl && emailEl.value) || "").trim();
      var feedback = document.getElementById("leadFeedback");

      if (honeypot && honeypot.value) {
        return; // bot detected
      }
      if (!isValidEmail(email)) {
        showMessage(feedback, "Por favor, informe um e-mail valido.", true);
        if (emailEl) emailEl.focus();
        return;
      }
      if (consent && !consent.checked) {
        showMessage(
          feedback,
          "E necessario aceitar receber comunicacoes.",
          true
        );
        consent.focus();
        return;
      }

      var leads = JSON.parse(
        localStorage.getItem("brazildecoded_leads") || "[]"
      );
      leads.push({ name: name, email: email, date: new Date().toISOString() });
      localStorage.setItem("brazildecoded_leads", JSON.stringify(leads));
      showMessage(feedback, "Obrigado! Seu e-mail foi registrado.");
      leadForm.reset();
    });
  }

  // Contact form
  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("contactName").value || "").trim();
      var email = (document.getElementById("contactEmail").value || "").trim();
      var message = (document.getElementById("contactMessage").value || "")
        .trim();
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
