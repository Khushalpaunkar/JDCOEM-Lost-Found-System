const rateLimit = require("express-rate-limit");

function getSafeReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render("auth/login", {
      error: "Too many login attempts. Please wait a few minutes and try again.",
      returnTo: getSafeReturnTo(req.body?.returnTo),
      success: null
    });
  }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render("auth/register", {
      error: "Too many registration attempts. Please wait a few minutes and try again.",
      success: null
    });
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render("auth/forgot-password", {
      error: "Too many reset link requests. Please wait a few minutes and try again.",
      success: null
    });
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const token =
      typeof req.params?.token === "string" && /^[a-f0-9]{64}$/i.test(req.params.token)
        ? req.params.token
        : null;

    res.status(429).render("auth/reset-password", {
      error: "Too many attempts. Please wait a few minutes and try again.",
      success: null,
      token
    });
  }
});

const issueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render("pages/report-issue", {
      title: "Report an Issue | SmartRecover",
      currentUser: req.session?.user || null,
      submitted: false,
      error:
        "Too many issue reports were submitted from this device. Please wait a few minutes and try again.",
      values: {},
      reference: null,
      supportEmail: "support@jdlostfound.edu"
    });
  }
});

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter, issueLimiter };
