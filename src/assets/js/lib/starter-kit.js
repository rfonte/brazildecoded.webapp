function isValidEmail(email) {
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

function getUTM(queryString) {
  const p = new URLSearchParams(queryString || "");
  return {
    utm_source: p.get("utm_source") || "",
    utm_medium: p.get("utm_medium") || "",
    utm_campaign: p.get("utm_campaign") || "",
  };
}

function buildPayload(options) {
  const utm = getUTM(options.queryString);
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

(function (root, factory) {
  /* c8 ignore start */
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BDStarterKit = factory();
  }
  /* c8 ignore end */
})(this, function () {
  return {
    isValidEmail: isValidEmail,
    getUTM: getUTM,
    buildPayload: buildPayload,
  };
});
