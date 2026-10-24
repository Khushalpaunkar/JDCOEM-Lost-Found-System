const mongoose = require("mongoose");
const IssueReport = require("../models/IssueReport");
const { sendEmail } = require("../utils/emailServices");

const SUPPORT_EMAIL = "support@jdlostfound.edu";

const CATEGORY_LABELS = {
  login_account: "Login/Account",
  report_submission: "Report Submission",
  claim_submission: "Claim Submission",
  image_upload: "Image Upload",
  email_notification: "Email Notification",
  ui_display: "UI/Display",
  other: "Other"
};

const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS);

function cleanText(value, maxLength) {
  const text = String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function validateIssueInput(body) {
  const errors = [];
  const category = cleanText(body.category, 40);
  const subject = cleanText(body.subject, 150);
  const description = cleanText(body.description, 4000);
  const page = cleanText(body.page, 300);
  const errorMessage = cleanText(body.errorMessage, 1000);

  if (!CATEGORY_VALUES.includes(category)) {
    errors.push("Choose a valid issue category.");
  }
  if (subject.length < 5) {
    errors.push("Enter a subject of at least 5 characters.");
  }
  if (description.length < 20) {
    errors.push("Describe the issue in at least 20 characters.");
  }

  return {
    errors,
    values: { category, subject, description, page, errorMessage }
  };
}

function renderForm(res, req, { status = 200, error = null, values = {} }) {
  return res.status(status).render("pages/report-issue", {
    title: "Report an Issue | SmartRecover",
    currentUser: req.session.user || null,
    submitted: false,
    error,
    values,
    reference: null,
    supportEmail: SUPPORT_EMAIL
  });
}

function getUserId(req) {
  return req.session?.user?.id || req.session?.user?._id;
}

async function notifySupport(issue, user) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn("IssueReport saved; email notifications are disabled (mail credentials missing).");
    return false;
  }

  const submittedAt = issue.createdAt
    ? issue.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  try {
    const result = await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[SmartRecover Issue] ${CATEGORY_LABELS[issue.category] || issue.category}: ${issue.subject}`,
      text: `A new issue was submitted on SmartRecover.

Category: ${CATEGORY_LABELS[issue.category] || issue.category}
Subject: ${issue.subject}
Submitted by: ${user.name || "Student"} (${user.email || "unknown"}) — account: ${issue.user}
Submitted on: ${submittedAt}
Affected page: ${issue.page || "Not provided"}
Reported error message: ${issue.errorMessage || "Not provided"}
Issue reference: ${issue._id}

Description:
${issue.description}

SmartRecover — Lost & Found JDCOEM`
    });

    const accepted = Array.isArray(result?.accepted) &&
      result.accepted.some(
        (address) => String(address).toLowerCase() === SUPPORT_EMAIL.toLowerCase()
      );
    if (!accepted) {
      console.warn("IssueReport email was not accepted by the configured mail transport.");
      return false;
    }
    return true;
  } catch (error) {
    console.error("IssueReport support email failed:", error.message);
    return false;
  }
}

// POST /report-issue
exports.submitIssue = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.redirect(`/login?returnTo=${encodeURIComponent("/report-issue")}`);
    }

    const { errors, values } = validateIssueInput(req.body);
    if (errors.length > 0) {
      return renderForm(res, req, { status: 400, error: errors.join(" "), values });
    }

    const issue = await IssueReport.create({
      user: userId,
      category: values.category,
      subject: values.subject,
      description: values.description,
      page: values.page,
      errorMessage: values.errorMessage
    });

    // Database save succeeded. Email notification is best-effort only and
    // never blocks or changes the success message (which claims only the save).
    // notifySupport never rejects, so this cannot create an unhandled rejection.
    notifySupport(issue, req.session.user);

    return res.redirect(`/report-issue?submitted=1&ref=${issue._id}`);
  } catch (error) {
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors || {})[0];
      return renderForm(res, req, {
        status: 400,
        error: firstError?.message || "Please check your answers and try again.",
        values: validateIssueInput(req.body).values
      });
    }

    console.error("Submit issue report error:", error);
    return renderForm(res, req, {
      status: 500,
      error:
        "Your issue could not be recorded right now. Please try again in a few minutes.",
      values: validateIssueInput(req.body).values
    });
  }
};
