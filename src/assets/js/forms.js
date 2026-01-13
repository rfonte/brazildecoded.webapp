// assets/forms.js
(function () {
  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/v7toev6h4hvpj1akkpsrhobamwdj9hkm";

  function getUTM() {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
    };
  }

  async function postToMake(payload) {
    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Make geralmente retorna 200/202
    if (!res.ok) throw new Error("Request failed: " + res.status);
  }

  function bindForm(formId, options) {
    const form = document.getElementById(formId);
    if (!form) return;

    const statusEl = form.querySelector("[data-status]");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Honeypot anti-spam
      const hp = form.querySelector('input[name="company"]');
      if (hp && hp.value) return;

      const utm = getUTM();

      const payload = {
        type: options.type, // "starter_kit" | "contact"
        page: window.location.pathname,
        referrer: document.referrer || "",
        user_agent: navigator.userAgent || "",
        ...utm,
      };

      // Campos comuns
      const email = form.querySelector('input[name="email"]');
      const name = form.querySelector('input[name="name"]');
      if (email) payload.email = (email.value || "").trim();
      if (name) payload.name = (name.value || "").trim();

      // Campo mensagem (contato)
      const message = form.querySelector('textarea[name="message"]');
      if (message) payload.message = (message.value || "").trim();

      // Validação mínima
      if (!payload.email) {
        if (statusEl) statusEl.textContent = "Please enter a valid email.";
        return;
      }

      if (statusEl) statusEl.textContent = "Sending...";

      try {
        await postToMake(payload);

        // Redirect pós-sucesso
        window.location.href = options.successUrl;
      } catch (err) {
        if (statusEl)
          statusEl.textContent = "Something went wrong. Please try again.";
        // opcional: console.error(err);
    });
      }
  }

  // Expor função global (simples)
  window.BDForms = { bindForm };
})();
