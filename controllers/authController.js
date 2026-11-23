
const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const imageStorage = require("../services/imageStorage");
const { sendEmail } = require("../utils/emailServices");

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_REGEX = /^[a-f0-9]{64}$/i;

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getResetBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function getSafeReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const target = new URL(value, "http://smartrecover.local");
    if (target.origin !== "http://smartrecover.local") return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

// Show registration page
exports.showRegister = (req, res) => {
  res.render("auth/register", {
    error: null,
    success: null
  });
};

// Register a new student
exports.register = async (req, res) => {
  const uploadedImageIds = [];

  try {
    let {
      name,
      collegeId,
      department,
      email,
      mobile,
      address,
      password,
      confirmPassword,
      termsAccepted
    } = req.body;

    // Required field validation
    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).render("auth/register", {
        error: "Please fill in all required fields.",
        success: null
      });
    }

    const profilePhoto = req.files?.profilePhoto?.[0];
    const collegeIdPhoto = req.files?.collegeIdPhoto?.[0];
    if (!profilePhoto || !collegeIdPhoto) {
      return res.status(400).render("auth/register", {
        error: "A profile photo and a college ID card image are both required.",
        success: null
      });
    }

    // Terms acceptance
    if (termsAccepted !== "true") {
      return res.status(400).render("auth/register", {
        error: "Please accept the Terms & Conditions.",
        success: null
      });
    }

    name = name.trim();
    email = email.trim().toLowerCase();
    collegeId = collegeId?.trim().toUpperCase() || undefined;
    mobile = mobile?.trim() || undefined;
    address = address?.trim() || "";

    // Validate name
    if (name.length < 2 || name.length > 60) {
      return res.status(400).render("auth/register", {
        error: "Name must contain 2 to 60 characters.",
        success: null
      });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).render("auth/register", {
        error: "Please enter a valid email address.",
        success: null
      });
    }

    // Validate password
    if (password.length < 6 || password.length > 72) {
      return res.status(400).render("auth/register", {
        error: "Password must contain 6 to 72 characters.",
        success: null
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render("auth/register", {
        error: "Passwords do not match.",
        success: null
      });
    }

    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).render("auth/register", {
        error: "Mobile number must contain exactly 10 digits.",
        success: null
      });
    }

    if (address.length > 250) {
      return res.status(400).render("auth/register", {
        error: "Address must not exceed 250 characters.",
        success: null
      });
    }

    // Check existing email
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(409).render("auth/register", {
        error: "This email is already registered. Please log in.",
        success: null
      });
    }

    // Check college ID only when provided
    if (collegeId) {
      const existingCollegeId = await User.findOne({ collegeId });

      if (existingCollegeId) {
        return res.status(409).render("auth/register", {
          error: "This College BT ID is already registered.",
          success: null
        });
      }
    }

    // Store normalized images first; remove them if saving the user fails.
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      name,
      collegeId,
      department: department || "",
      email,
      mobile,
      address,
      password: hashedPassword
    });

    user.profilePhotoFileId = await imageStorage.uploadImage(
      profilePhoto,
      user._id,
      "profile-photo"
    );
    uploadedImageIds.push(user.profilePhotoFileId);

    user.collegeIdPhotoFileId = await imageStorage.uploadImage(
      collegeIdPhoto,
      user._id,
      "college-id"
    );
    uploadedImageIds.push(user.collegeIdPhotoFileId);

    await user.save();
    uploadedImageIds.length = 0;

    try {
      await new Promise((resolve, reject) => {
        req.session.regenerate((sessionError) => {
          if (sessionError) {
            return reject(sessionError);
          }

          req.session.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
          };

          req.session.save((saveError) => {
            if (saveError) {
              return reject(saveError);
            }
            return resolve();
          });
        });
      });
    } catch (sessionError) {
      console.error("Registration session error:", sessionError.message);
      return res.redirect("/login?registered=success");
    }

    return res.redirect("/");

  } catch (error) {
    console.error("Registration error:", error);
    await Promise.allSettled(uploadedImageIds.map(imageStorage.deleteImage));

    if (error.code === "INVALID_IMAGE") {
      return res.status(400).render("auth/register", {
        error: error.message,
        success: null
      });
    }

    // Handle duplicate-key race conditions
    if (error.code === 11000) {
      return res.status(409).render("auth/register", {
        error: "This email or College BT ID is already registered.",
        success: null
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).render("auth/register", {
        error: "Please check your details and try again.",
        success: null
      });
    }

    return res.status(500).render("auth/register", {
      error: "Something went wrong. Please try again.",
      success: null
    });
  }
};



/* Show login page */
exports.showLogin = (req, res) => {
  const returnTo = getSafeReturnTo(req.query.returnTo);
  if (req.session && req.session.user) {
    return res.redirect(returnTo || "/");
  }

  res.render("auth/login", {
    error: null,
    returnTo,
    success:
      req.query.registered === "success"
        ? "Account created successfully! Please log in."
        : req.query.reset === "success"
          ? "Password reset successful! Please log in with your new password."
          : null
  });
};

/* Login existing student */
exports.login = async (req, res) => {
  const returnTo = getSafeReturnTo(req.body.returnTo);
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).render("auth/login", {
        error: "Please enter your email and password.",
        returnTo,
        success: null
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).render("auth/login", {
        error: "Invalid email or password.",
        returnTo,
        success: null
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).render("auth/login", {
        error: "Invalid email or password.",
        returnTo,
        success: null
      });
    }

    // Create a fresh session after successful authentication
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session creation error:", err.message);
        return res.status(500).render("auth/login", {
          error: "Unable to log in right now. Please try again.",
          returnTo,
          success: null
        });
      }

      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError.message);
          return res.status(500).render("auth/login", {
            error: "Unable to complete login. Please try again.",
            returnTo,
            success: null
          });
        }

        return res.redirect(returnTo || "/");
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).render("auth/login", {
      error: "Something went wrong. Please try again.",
      returnTo,
      success: null
    });
  }
};

/* Logout student */
exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err.message);
      return next(err);
    }

    res.clearCookie("smartrecover.sid");
    return res.redirect("/");
  });
};

/* Show forgot password page */
exports.showForgotPassword = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/");
  }

  res.render("auth/forgot-password", {
    error: null,
    success: null
  });
};

/* Send password reset link */
exports.forgotPassword = async (req, res) => {
  const genericSuccess =
    "If an account with that email exists, a password reset link has been sent. Please check your inbox.";

  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).render("auth/forgot-password", {
        error: "Please enter a valid email address.",
        success: null
      });
    }

    const user = await User.findOne({ email, isActive: true });

    if (user) {
      const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            resetPasswordToken: hashResetToken(rawToken),
            resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS)
          }
        }
      );

      const resetUrl = `${getResetBaseUrl(req)}/reset-password/${rawToken}`;

      try {
        await sendEmail({
          to: user.email,
          subject: "SmartRecover – Reset Your Password",
          text:
            `Hello ${user.name},\n\n` +
            `We received a request to reset your SmartRecover password.\n\n` +
            `Click the link below to choose a new password (valid for 15 minutes):\n\n` +
            `${resetUrl}\n\n` +
            `If you did not request this, you can safely ignore this email. ` +
            `Your password will not change until you set a new one.\n\n` +
            `— SmartRecover Team`
        });
      } catch (emailError) {
        console.error("Password reset email failed:", emailError.message);
      }
    }

    return res.status(200).render("auth/forgot-password", {
      error: null,
      success: genericSuccess
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).render("auth/forgot-password", {
      error: "Something went wrong. Please try again.",
      success: null
    });
  }
};

/* Show reset password page */
exports.showResetPassword = async (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/");
  }

  const { token } = req.params;
  const invalidLinkError =
    "This password reset link is invalid or has expired. Please request a new one.";

  try {
    if (!token || !RESET_TOKEN_REGEX.test(token)) {
      return res.status(400).render("auth/reset-password", {
        error: invalidLinkError,
        success: null,
        token: null
      });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpires: { $gt: new Date() }
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).render("auth/reset-password", {
        error: invalidLinkError,
        success: null,
        token: null
      });
    }

    return res.render("auth/reset-password", {
      error: null,
      success: null,
      token
    });
  } catch (error) {
    console.error("Reset password page error:", error.message);

    return res.status(500).render("auth/reset-password", {
      error: "Something went wrong. Please try again.",
      success: null,
      token: null
    });
  }
};

/* Reset the password */
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const invalidLinkError =
    "This password reset link is invalid, expired, or has already been used. Please request a new one.";

  try {
    const { newPassword, confirmPassword } = req.body;

    if (!token || !RESET_TOKEN_REGEX.test(token)) {
      return res.status(400).render("auth/reset-password", {
        error: invalidLinkError,
        success: null,
        token: null
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).render("auth/reset-password", {
        error: "Please fill in both password fields.",
        success: null,
        token
      });
    }

    if (newPassword.length < 6 || newPassword.length > 72) {
      return res.status(400).render("auth/reset-password", {
        error: "Password must contain 6 to 72 characters.",
        success: null,
        token
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).render("auth/reset-password", {
        error: "Passwords do not match.",
        success: null,
        token
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atomic single-use update: only succeeds while the token is valid and
    // unexpired, and clears it immediately so the link cannot be replayed.
    const updatedUser = await User.findOneAndUpdate(
      {
        resetPasswordToken: hashResetToken(token),
        resetPasswordExpires: { $gt: new Date() }
      },
      {
        $set: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      },
      { new: true }
    ).select("+resetPasswordToken +resetPasswordExpires");

    if (!updatedUser) {
      return res.status(400).render("auth/reset-password", {
        error: invalidLinkError,
        success: null,
        token: null
      });
    }

    return res.redirect("/login?reset=success");
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).render("auth/reset-password", {
      error: "Something went wrong. Please try again.",
      success: null,
      token: token && RESET_TOKEN_REGEX.test(token) ? token : null
    });
  }
};
