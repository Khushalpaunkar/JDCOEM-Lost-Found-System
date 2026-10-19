const express = require("express");
const router = express.Router();
const foundReportController = require("../controllers/foundReportController");
const upload = require("../middleware/upload");
const { requireAuth } = require("../middleware/authMiddleware");

router.get(
  "/items/:id/report-found",
  requireAuth,
  foundReportController.showFoundReportForm
);
router.post(
  "/items/:id/report-found",
  requireAuth,
  foundReportController.validateTarget,
  upload.array("image", 5),
  foundReportController.submitFoundReport,
  foundReportController.handleUploadError
);

module.exports = router;
