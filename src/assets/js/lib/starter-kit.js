(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BDStarterKit = factory();
  }
})(this, function () {
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
  }

  function getUTM(queryString) {
    var p = new URLSearchParams(queryString || "");
    return {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
    };
  }

  function buildPayload(options) {
    var utm = getUTM(options.queryString);
    return {
      type: options.type || "",
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

  return {
    isValidEmail: isValidEmail,
    getUTM: getUTM,
    buildPayload: buildPayload,
  };
});
