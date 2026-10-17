
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    // Basic item information
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Electronics",
        "ID Card",
        "Books & Notes",
        "Wallet & Money",
        "Keys",
        "Bags",
        "Clothing",
        "Accessories",
        "Documents",
        "Other"
      ]
    },

    // Lost or Found report type
    status: {
      type: String,
      enum: ["lost", "found"],
      required: true,
      index: true
    },

    // Item images: URLs or storage references
    image: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length <= 5,
        message: "Maximum 5 images are allowed."
      }
    },

    // Location and date details
    location: {
      type: String,
      required: true,
      trim: true
    },

    date: {
      type: Date,
      default: Date.now
    },

    time: {
      type: String,
      trim: true
    },

    // Student who submitted the report
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // Contact details: prefer fetching these from User
    personalInfo: {
      name: { type: String, trim: true },
      number: { type: String, trim: true },
      collegeId: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      department: { type: String, trim: true },
      role: { type: String, trim: true }
    },

    // Recovery lifecycle, separate from lost/found type
    recoveryStatus: {
      type: String,
      enum: [
        "open",
        "claim_pending",
        "claimed",
        "recovered",
        "closed"
      ],
      default: "open",
      index: true
    },

    // Claim tracking
    claims: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Claim"
      }
    ],

    // Optional moderation
    isApproved: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Useful for filtering and sorting the Items page
itemSchema.index({
  status: 1,
  category: 1,
  recoveryStatus: 1,
  createdAt: -1
});

module.exports = mongoose.model("Item", itemSchema);
