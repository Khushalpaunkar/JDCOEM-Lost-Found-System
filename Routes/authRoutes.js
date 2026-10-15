
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/authMiddleware");
const imageUpload = require("../middleware/imageUpload");

// Registration
router.get("/register", authController.showRegister);
router.post("/register", imageUpload.registrationImages, authController.register);

// Login and logout
router.get("/login", authController.showLogin);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Authenticated profile and image routes
router.get("/profile", requireAuth, profileController.showProfile);
router.post("/profile/images", requireAuth, imageUpload.profileImages, profileController.updateImages);
router.get("/users/:userId/images/:kind", requireAuth, profileController.showImage);

module.exports = router;
