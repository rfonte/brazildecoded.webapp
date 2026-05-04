/**
 * Returns true when the input string is a plausible email address.
 * This is intentionally simple and sufficient for client-side validation.
 * @param {string} email The email string to validate.
 * @returns {boolean} True when the email appears valid.
 */
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

/**
 * Extracts UTM tracking parameters from a query string.
 * @param {string} queryString The URL search portion, including leading ?.
 * @returns {{utm_source:string,utm_medium:string,utm_campaign:string}}
 */
function getUTM(queryString) {
  const p = new URLSearchParams(queryString || "");
  return {
    utm_source: (p.get("utm_source") || "").trim(),
    utm_medium: (p.get("utm_medium") || "").trim(),
    utm_campaign: (p.get("utm_campaign") || "").trim(),
  };
}

/**
 * Builds a normalized payload object for form submission.
 * This helper centralizes UTM and browser metadata extraction.
 * @param {Object} options The payload source values.
 */
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

/**
 * Exposes starter kit utilities in both CommonJS and browser environments.
 * This allows Node-based tests to import the helper module and browser code
 * to access BDStarterKit globally.
 */
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
