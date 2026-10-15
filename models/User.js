const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: 2,
      maxlength: 60
    },

    collegeId: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true
    },

    department: {
      type: String,
      enum: ["CSE", "IT", "ECE", "MECH", "CIVIL", "ENTC", ""],
      default: ""
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email"]
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
      match: [/^\d{10}$/, "Enter a valid 10-digit mobile number"]
    },

    address: {
      type: String,
      trim: true,
      maxlength: 250,
      default: ""
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    profilePhoto: {
      type: String,
      default: ""
    },

    profilePhotoFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    collegeIdPhoto: {
      type: String,
      default: ""
    },

    collegeIdPhotoFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student"
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);