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

module.exports = { loginLimiter, registerLimiter };
