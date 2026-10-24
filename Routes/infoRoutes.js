const express = require("express");
const router = express.Router();

const infoController = require("../controllers/infoController");
const issueController = require("../controllers/issueController");
const { requireAuth } = require("../middleware/authMiddleware");
const { issueLimiter } = require("../middleware/rateLimiter");

// Informational pages (public)
router.get("/support", infoController.showSupport);
router.get("/faq", infoController.showFaq);
router.get("/privacy-policy", infoController.showPrivacyPolicy);
router.get("/terms-of-use", infoController.showTermsOfUse);

// Issue reporting (authenticated, consistent with report/claim access policy)
router.get("/report-issue", requireAuth, infoController.showReportIssue);
router.post("/report-issue", requireAuth, issueLimiter, issueController.submitIssue);

module.exports = router;
