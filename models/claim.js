
const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },

    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 1000
    },

    proofDetails: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    },

    proofPhotos: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
      validate: {
        validator: (photos) => photos.length <= 5,
        message: "Maximum 5 proof photos are allowed."
      }
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Claim", claimSchema);
