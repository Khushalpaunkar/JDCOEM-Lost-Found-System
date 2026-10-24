const infoPageMeta = {
  support: {
    view: "pages/support",
    title: "Support | SmartRecover"
  },
  faq: {
    view: "pages/faq",
    title: "FAQ | SmartRecover"
  },
  privacy: {
    view: "pages/privacy-policy",
    title: "Privacy Policy | SmartRecover"
  },
  terms: {
    view: "pages/terms-of-use",
    title: "Terms of Use | SmartRecover"
  }
};

function renderInfoPage(req, res, key) {
  const meta = infoPageMeta[key];
  return res.render(meta.view, {
    title: meta.title,
    currentUser: req.session.user || null
  });
}

// GET /support
exports.showSupport = (req, res) => renderInfoPage(req, res, "support");

// GET /faq
exports.showFaq = (req, res) => renderInfoPage(req, res, "faq");

// GET /privacy-policy
exports.showPrivacyPolicy = (req, res) => renderInfoPage(req, res, "privacy");

// GET /terms-of-use
exports.showTermsOfUse = (req, res) => renderInfoPage(req, res, "terms");

// GET /report-issue
exports.showReportIssue = (req, res) => {
  const submitted = req.query.submitted === "1";
  const rawRef = typeof req.query.ref === "string" ? req.query.ref.trim() : "";
  const reference = /^[0-9a-fA-F]{24}$/.test(rawRef)
    ? rawRef.slice(-8).toUpperCase()
    : null;

  return res.render("pages/report-issue", {
    title: "Report an Issue | SmartRecover",
    currentUser: req.session.user || null,
    submitted,
    error: null,
    values: {},
    reference,
    supportEmail: "support@jdlostfound.edu"
  });
};
