
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/authMiddleware");
const imageUpload = require("../middleware/imageUpload");
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require("../middleware/rateLimiter");

// Registration
router.get("/register", authController.showRegister);
router.post("/register", registerLimiter, imageUpload.registrationImages, authController.register);

// Login and logout
router.get("/login", authController.showLogin);
router.post("/login", loginLimiter, authController.login);
router.post("/logout", authController.logout);

// Forgot / reset password
router.get("/forgot-password", authController.showForgotPassword);
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
router.get("/reset-password/:token", authController.showResetPassword);
router.post("/reset-password/:token", resetPasswordLimiter, authController.resetPassword);

// Authenticated profile and image routes
router.get("/profile", requireAuth, profileController.showProfile);
router.get("/profile/edit", requireAuth, profileController.showEditProfile);
router.post("/profile/edit", requireAuth, profileController.updateProfile);
router.post("/profile/images", requireAuth, imageUpload.profileImages, profileController.updateImages);
router.get("/users/:userId/images/:kind", requireAuth, profileController.showImage);

module.exports = router;
