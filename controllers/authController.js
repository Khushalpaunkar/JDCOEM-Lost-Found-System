
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const imageStorage = require("../services/imageStorage");

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
  if (req.session && req.session.user) {
    return res.redirect("/");
  }

  res.render("auth/login", {
    error: null,
    success:
      req.query.registered === "success"
        ? "Account created successfully! Please log in."
        : null
  });
};

/* Login existing student */
exports.login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).render("auth/login", {
        error: "Please enter your email and password.",
        success: null
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).render("auth/login", {
        error: "Invalid email or password.",
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
        success: null
      });
    }

    // Create a fresh session after successful authentication
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session creation error:", err.message);
        return res.status(500).render("auth/login", {
          error: "Unable to log in right now. Please try again.",
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
            success: null
          });
        }

        // Temporary destination until the dashboard page is ready
        return res.redirect("/");
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).render("auth/login", {
      error: "Something went wrong. Please try again.",
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

