const mongoose = require("mongoose");

const ISSUE_CATEGORIES = [
  "login_account",
  "report_submission",
  "claim_submission",
  "image_upload",
  "email_notification",
  "ui_display",
  "other"
];

const issueReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    category: {
      type: String,
      enum: ISSUE_CATEGORIES,
      required: true
    },

    subject: {
      type: String,
      required: [true, "A short issue summary is required."],
      trim: true,
      minlength: 5,
      maxlength: 150
    },

    description: {
      type: String,
      required: [true, "A detailed description is required."],
      trim: true,
      minlength: 20,
      maxlength: 4000
    },

    page: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },

    errorMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open"
    }
  },
  { timestamps: true }
);

issueReportSchema.index({ createdAt: -1 });
issueReportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("IssueReport", issueReportSchema);
module.exports.ISSUE_CATEGORIES = ISSUE_CATEGORIES;
