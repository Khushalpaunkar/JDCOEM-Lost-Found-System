
const express = require("express");
const router = express.Router();
const claimController = require("../controllers/claimController");
const imageUpload = require("../middleware/imageUpload");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/items/:id/claim", requireAuth, claimController.showClaimForm);
router.post(
	"/items/:id/claim",
	requireAuth,
	imageUpload.claimProofPhotos,
	claimController.submitClaim
);
router.get(
	"/items/:id/claims/:claimId/proof-photos/:photoId",
	requireAuth,
	claimController.showProofPhoto
);

module.exports = router;
