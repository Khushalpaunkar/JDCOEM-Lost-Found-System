const mongoose = require("mongoose");
const FoundReport = require("../models/FoundReport");
const Item = require("../models/item");
const User = require("../models/User");
const deleteCloudinaryUploads = require("../utils/deleteCloudinaryUploads");
const { sendEmail } = require("../utils/emailServices");
const { renderErrorPage } = require("../middleware/errorHandler");

function getUserId(req) {
  return req.session?.user?._id || req.session?.user?.id;
}

async function loadOpenLostItem(id) {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid Lost report ID.");
    error.status = 400;
    throw error;
  }

  const item = await Item.findById(id);
  if (!item) {
    const error = new Error("Lost report not found.");
    error.status = 404;
    throw error;
  }

  if (item.status !== "lost" || (item.recoveryStatus || "open") !== "open") {
    const error = new Error("This Lost report is not accepting Found reports.");
    error.status = 409;
    throw error;
  }

  return item;
}

function isOwnLostReport(item, userId) {
  return String(item.reportedBy) === String(userId);
}

function renderFoundForm(res, req, options = {}) {
  return res.status(options.status || 200).render("items/found-report", {
    title: `Report Found Item | SmartRecover`,
    currentUser: req.session.user,
    lostItem: options.lostItem,
    error: options.error || null,
    success: options.success || false,
    existingReport: options.existingReport || null
  });
}

function getItemUrl(itemId) {
  const path = `/items/${itemId}`;
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) return path;

  try {
    const base = new URL(baseUrl);
    if (!["http:", "https:"].includes(base.protocol)) return path;
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

async function notifyLostReporter(lostItem, report) {
  try {
    const reporter = await User.findById(lostItem.reportedBy)
      .select("name email")
      .lean();
    if (!reporter?.email) {
      console.warn("FoundReport saved; original Lost reporter has no email address.");
      return;
    }

    const foundDate = report.date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const mailResult = await sendEmail({
      to: reporter.email,
      subject: `A Found report was submitted for ${lostItem.title}`,
      text: `Hello ${reporter.name || "Student"},

   A student submitted a Found report referencing your Lost report. This is a notification only; it does not verify ownership or mean the item has been recovered.

  Lost item: ${lostItem.title}
  Found location: ${report.location}
  Found date: ${foundDate}${report.time ? ` at ${report.time}` : ""}
  Found details: ${report.description}

    View your Lost report: ${getItemUrl(lostItem._id)}

  SmartRecover — Lost & Found JDCOEM`
    });

    const accepted = Array.isArray(mailResult?.accepted) &&
      mailResult.accepted.some((address) => String(address).toLowerCase() === reporter.email.toLowerCase());
    if (!accepted) {
      console.warn("FoundReport email was not accepted by the configured mail transport.");
    }
  } catch (error) {
    console.error("FoundReport notification email failed:", error.message);
  }
}

exports.showFoundReportForm = async (req, res) => {
  try {
    const lostItem = await loadOpenLostItem(req.params.id);
    const finderId = getUserId(req);
    if (isOwnLostReport(lostItem, finderId)) {
      return renderErrorPage(res, req, 403, "You cannot submit a Found report for your own Lost report.");
    }

    const existingReport = await FoundReport.findOne({
      lostItem: lostItem._id,
      foundBy: finderId
    }).lean();
    const success = Boolean(
      req.query.submitted === "1" &&
      existingReport &&
      String(existingReport._id) === String(req.query.report)
    );

    return renderFoundForm(res, req, {
      lostItem,
      existingReport,
      success
    });
  } catch (error) {
    return renderErrorPage(
      res,
      req,
      error.status || 500,
      error.status ? error.message : "Unable to load this Found report form."
    );
  }
};

exports.validateTarget = async (req, res, next) => {
  try {
    const lostItem = await loadOpenLostItem(req.params.id);
    const finderId = getUserId(req);
    if (isOwnLostReport(lostItem, finderId)) {
      return renderErrorPage(res, req, 403, "You cannot submit a Found report for your own Lost report.");
    }

    const existingReport = await FoundReport.findOne({
      lostItem: lostItem._id,
      foundBy: finderId
    }).select("_id").lean();
    if (existingReport) {
      return res.redirect(`/items/${lostItem._id}/report-found`);
    }

    req.lostItem = lostItem;
    return next();
  } catch (error) {
    return renderErrorPage(
      res,
      req,
      error.status || 500,
      error.status ? error.message : "Unable to validate this Lost report."
    );
  }
};

exports.submitFoundReport = async (req, res) => {
  const files = req.files || [];
  let savedReport;
  try {
    const lostItem = await loadOpenLostItem(req.params.id);
    const finderId = getUserId(req);
    if (isOwnLostReport(lostItem, finderId)) {
      await deleteCloudinaryUploads(files);
      return renderErrorPage(res, req, 403, "You cannot submit a Found report for your own Lost report.");
    }

    const description = String(req.body.description || "").trim();
    const location = String(req.body.location || "").trim();
    const rawDate = String(req.body.date || "").trim();
    const time = String(req.body.time || "").trim();
    const date = rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : new Date();

    if (description.length < 10 || description.length > 2000) {
      throw Object.assign(new Error("Description must contain 10–2,000 characters."), { status: 400 });
    }
    if (!location || location.length > 200) {
      throw Object.assign(new Error("Enter a found location up to 200 characters."), { status: 400 });
    }
    if (rawDate && (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== rawDate
    )) {
      throw Object.assign(new Error("Enter a valid found date."), { status: 400 });
    }
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw Object.assign(new Error("Enter a valid found time."), { status: 400 });
    }
    if (files.length > 5) {
      throw Object.assign(new Error("Upload no more than 5 photos."), { status: 400 });
    }

    const imageUrls = files.map((file) => file.path);
    const hasInvalidImageUrl = imageUrls.some((imageUrl) => {
      try {
        const parsedUrl = new URL(imageUrl);
        return parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com";
      } catch {
        return true;
      }
    });
    if (hasInvalidImageUrl) {
      throw Object.assign(new Error("One or more photos could not be uploaded. Please try again."), { status: 502 });
    }

    savedReport = await FoundReport.create({
      lostItem: lostItem._id,
      foundBy: finderId,
      description,
      location,
      date,
      time: time || undefined,
      image: imageUrls
    });

    await notifyLostReporter(lostItem, savedReport);
    return res.redirect(`/items/${lostItem._id}/report-found?submitted=1&report=${savedReport._id}`);
  } catch (error) {
    if (savedReport) {
      console.error("FoundReport saved; post-save processing did not complete:", error.message);
      return res.redirect(`/items/${req.params.id}/report-found?submitted=1&report=${savedReport._id}`);
    }

    await deleteCloudinaryUploads(files);
    if (error.code === 11000) {
      return res.redirect(`/items/${req.params.id}/report-found`);
    }

    if (!error.status && error.name === "ValidationError") {
      error.status = 400;
    }
    const status = error.status || 500;
    if (status >= 500) {
      console.error("FoundReport submission failed:", error.message);
    }
    const lostItem = req.lostItem || await Item.findById(req.params.id).catch(() => null);
    if (lostItem) {
      return renderFoundForm(res, req, {
        status,
        lostItem,
        error: status === 400 || status === 502
          ? error.message
          : "Unable to submit your Found report. Please try again."
      });
    }
    return renderErrorPage(
      res,
      req,
      status,
      status === 400 ? error.message : "Unable to submit your Found report."
    );
  }
};

exports.handleUploadError = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const isLimit = typeof error.code === "string" && error.code.startsWith("LIMIT_");
  const isUnsupported = error.message === "Only JPG, PNG and WEBP images are allowed.";
  const status = isLimit || isUnsupported ? 400 : 502;
  const message = isLimit
    ? "Please upload no more than 5 images, each 5 MB or smaller."
    : isUnsupported
      ? error.message
      : "Your photos could not be uploaded. Please try again later.";
  return renderErrorPage(res, req, status, message);
};
