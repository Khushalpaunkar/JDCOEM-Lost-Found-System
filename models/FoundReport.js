const mongoose = require("mongoose");

const foundReportSchema = new mongoose.Schema(
  {
    lostItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true
    },

    foundBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    date: {
      type: Date,
      default: Date.now
    },

    time: {
      type: String,
      trim: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },

    image: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length <= 5,
        message: "Maximum 5 images are allowed."
      }
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "closed"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

foundReportSchema.index({ lostItem: 1, createdAt: -1 });
foundReportSchema.index({ lostItem: 1, foundBy: 1 }, { unique: true });

module.exports = mongoose.model("FoundReport", foundReportSchema, "foundReports");
