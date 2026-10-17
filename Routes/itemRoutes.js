
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const itemController = require("../controllers/itemController");

const cloudinarySecrets = [
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET
].filter(Boolean);

function redactCloudinarySecrets(value) {
  return cloudinarySecrets.reduce(
    (message, secret) => message.split(secret).join("[REDACTED]"),
    String(value || "Unknown upload error")
  );
}

function summarizeUploadError(error) {
  const summarize = (cause) => cause
    ? {
        name: cause.name || "Error",
        message: redactCloudinarySecrets(cause.message),
        httpCode: cause.http_code || cause.httpCode || null
      }
    : null;

  return {
    ...summarize(error),
    cause: summarize(error.cause),
    storageErrors: Array.isArray(error.storageErrors)
      ? error.storageErrors.map(summarize)
      : []
  };
}

function handleReportUploadError(error, req, res, next) {
  if (res.headersSent) return next(error);

  console.error("Report image upload failed", summarizeUploadError(error));

  const isMulterLimit = typeof error.code === "string" && error.code.startsWith("LIMIT_");
  const statusCode = isMulterLimit ? 400 : 502;
  const message = isMulterLimit
    ? "Please upload no more than 5 images, each 5 MB or smaller."
    : "Your images could not be uploaded. Please try again later.";

  return res.status(statusCode).send(message);
}

// Protect routes that create reports
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
};

// Single report form
router.get("/report", requireLogin, itemController.showReportForm);
router.post(
  "/report",
  requireLogin,
  upload.array("image", 5),
  itemController.createItem,
  handleReportUploadError
);

// Browse items and view details
router.get("/items", itemController.getAllItems);
router.get("/items/:id", itemController.getItemDetails);

module.exports = router;
