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
 * @returns {{utm_source:string,utm_medium:string,utm_campaign:string,utm_content:string,utm_term:string}}
 */
function getUTM(queryString) {
  const p = new URLSearchParams(queryString || "");
  return {
    utm_source: (p.get("utm_source") || "").trim(),
    utm_medium: (p.get("utm_medium") || "").trim(),
    utm_campaign: (p.get("utm_campaign") || "").trim(),
    utm_content: (p.get("utm_content") || "").trim(),
    utm_term: (p.get("utm_term") || "").trim(),
  };
}

/**
 * Returns true when enough time has passed since the form was rendered,
 * indicating a human rather than a bot filled it in.
 * @param {number} startedAt Timestamp (ms) recorded when the form was shown.
 * @param {number} [minMs=3000] Minimum required elapsed time in milliseconds.
 * @param {number} [now] Current timestamp; injectable for testing (default: Date.now()).
 * @returns {boolean}
 */
function isHumanTiming(startedAt, minMs, now) {
  var ms = minMs === undefined ? 3000 : minMs;
  var ts = Number(startedAt);
  if (!ts || isNaN(ts) || ts <= 0) return false;
  var current = now === undefined ? Date.now() : now;
  return current - ts >= ms;
}

/**
 * Builds a normalized payload object for form submission.
 * This helper centralizes UTM and browser metadata extraction.
 * @param {Object} options The payload source values.
 * @returns {Object} Normalized payload ready for JSON submission.
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
    source: options.source || "",
    form_token: options.formToken || "",
    form_started_at: options.formStartedAt || "",
    consent: options.consent === true || options.consent === "on",
    company: options.company || "",
    turnstile_token: options.turnstileToken || "",
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
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
    isHumanTiming: isHumanTiming,
    buildPayload: buildPayload,
  };
});
