
const mongoose = require("mongoose");
const Claim = require("../models/claim");
const Item = require("../models/item");
const imageStorage = require("../services/imageStorage");
const User = require("../models/User");
const { sendClaimEmail } = require("../utils/emailServices");
const { renderErrorPage } = require("../middleware/errorHandler");

function getUserId(req) {
  return req.session?.user?._id || req.session?.user?.id;
}

function isClaimEligible(item) {
  return item.status === "found" && (item.recoveryStatus || "open") === "open";
}

exports.showClaimForm = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return renderErrorPage(res, req, 400, "Invalid item ID.");
    }

    const item = await Item.findById(req.params.id).lean();

    if (!item) {
      return renderErrorPage(res, req, 404, "Item not found.");
    }

    if (!isClaimEligible(item)) {
      return res.redirect(`/items/${item._id}`);
    }

    if (String(item.reportedBy) === String(getUserId(req))) {
      return res.redirect(`/items/${item._id}`);
    }

    res.render("items/claim", {
      title: `Claim ${item.title} | SmartRecover`,
      currentUser: req.session.user,
      item,
      error: null,
      success: req.query.submitted === "1"
    });
  } catch (error) {
    console.error("Show claim form error:", error);
    return renderErrorPage(res, req, 500, "Unable to load claim form.");
  }
};

exports.submitClaim = async (req, res) => {
  const uploadedPhotoIds = [];
  let item;

  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return renderErrorPage(res, req, 400, "Invalid item ID.");
    }

    item = await Item.findById(req.params.id);

    if (!item) {
      return renderErrorPage(res, req, 404, "Item not found.");
    }

    if (!isClaimEligible(item)) {
      return renderErrorPage(res, req, 409, "This item is not accepting claims.");
    }

    if (String(item.reportedBy) === String(userId)) {
      return renderErrorPage(res, req, 403, "You cannot claim an item you reported.");
    }

    if (req.claimProofUploadError) {
      const uploadError = req.claimProofUploadError;
      const message = uploadError.code === "LIMIT_FILE_SIZE"
        ? "Each proof photo must be 5 MB or smaller."
        : "Upload no more than 5 proof photos at a time.";

      return res.status(400).render("items/claim", {
        title: `Claim ${item.title} | SmartRecover`,
        currentUser: req.session.user,
        item: item.toObject(),
        error: message
      });
    }

    const description = (req.body.description || "").trim();
    const proofDetails = (req.body.proofDetails || "").trim();
    const contactNumber = (req.body.contactNumber || "").trim();

    if (
      description.length < 20 ||
      description.length > 1000 ||
      proofDetails.length < 10 ||
      proofDetails.length > 1000 ||
      !/^[0-9+\-\s()]{7,15}$/.test(contactNumber)
    ) {
      return res.status(400).render("items/claim", {
        title: `Claim ${item.title} | SmartRecover`,
        currentUser: req.session.user,
        item: item.toObject(),
        error:
          "Please check your answers. Description must be 20–1000 characters, proof must be 10–1000 characters, and contact number must be valid."
      });
    }

    // Prevent duplicate pending claims by the same user for the same item.
    const existingClaim = await Claim.findOne({
      item: item._id,
      claimedBy: userId,
      status: "pending"
    });

    if (existingClaim) {
      return res.status(409).render("items/claim", {
        title: `Claim ${item.title} | SmartRecover`,
        currentUser: req.session.user,
        item: item.toObject(),
        error: "You already have a pending claim for this item."
      });
    }

    for (const file of req.files || []) {
      uploadedPhotoIds.push(
        await imageStorage.uploadImage(file, userId, "claim-proof")
      );
    }

    

const claim = await Claim.create({
  item: item._id,
  claimedBy: userId,
  description,
  proofDetails,
  proofPhotos: uploadedPhotoIds,
  contactNumber
});

uploadedPhotoIds.length = 0;

// The claim is saved. Send notification emails separately.
try {
  const [claimant, reporter] = await Promise.all([
    User.findById(userId).select("name email").lean(),
    User.findById(item.reportedBy).select("name email").lean()
  ]);

  const itemTitle = item.title || "Reported item";
  const reference = claim._id.toString();
  const submittedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
  });

  const emailTasks = [];

  if (claimant?.email) {
    emailTasks.push(
      sendClaimEmail({
        to: claimant.email,
        subject: `Claim submitted successfully — ${itemTitle}`,
        text: `Hello ${claimant.name || "Student"},

Your claim has been submitted successfully.

Item: ${itemTitle}
Claim reference: ${reference}
Submitted on: ${submittedAt}
Status: Pending review

Please wait while your claim is reviewed.

SmartRecover — Lost & Found JDCOEM`
      })
    );
  }

  if (
    reporter?.email &&
    String(reporter._id) !== String(claimant?._id)
  ) {
    emailTasks.push(
      sendClaimEmail({
        to: reporter.email,
        subject: `New claim received — ${itemTitle}`,
        text: `Hello ${reporter.name || "Student"},

Someone has submitted a claim for your reported item.

Item: ${itemTitle}
Claim reference: ${reference}
Submitted on: ${submittedAt}
Status: Pending review

Please log in to SmartRecover to review the claim.

SmartRecover — Lost & Found JDCOEM`
      })
    );
  }

  const results = await Promise.allSettled(emailTasks);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Claim notification email failed:", result.reason);
    }
  });

} catch (emailError) {
  console.error("Claim email notification error:", emailError);
}

return res.redirect(`/items/${item._id}/claim?submitted=1`);

  } catch (error) {
    await Promise.allSettled(uploadedPhotoIds.map(imageStorage.deleteImage));

    if (error.code === "INVALID_IMAGE" && item) {
      return res.status(400).render("items/claim", {
        title: `Claim ${item.title} | SmartRecover`,
        currentUser: req.session.user,
        item: item.toObject(),
        error: "Upload valid JPG, PNG, or WebP proof photos, each 5 MB or smaller."
      });
    }

    console.error("Submit claim error:", error);
    return renderErrorPage(res, req, 500, "Unable to submit your claim.");
  }
};

exports.showProofPhoto = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
    }

    const { id: itemId, claimId, photoId } = req.params;
    if (![itemId, claimId, photoId].every(mongoose.isValidObjectId)) {
      return res.sendStatus(404);
    }

    const [item, claim] = await Promise.all([
      Item.findById(itemId).select("reportedBy").lean(),
      Claim.findOne({ _id: claimId, item: itemId })
        .select("claimedBy proofPhotos")
        .lean()
    ]);

    if (!item || !claim || !claim.proofPhotos.some((id) => id.equals(photoId))) {
      return res.sendStatus(404);
    }

    const sessionUser = req.session.user;
    const canView = sessionUser.role === "admin" ||
      String(claim.claimedBy) === String(userId) ||
      String(item.reportedBy) === String(userId);
    if (!canView) {
      return res.sendStatus(403);
    }

    const stream = await imageStorage.openImage(photoId);
    if (!stream) {
      return res.sendStatus(404);
    }

    res.set({
      "Cache-Control": "private, no-store",
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff"
    });
    stream.on("error", () => {
      if (!res.headersSent) {
        res.sendStatus(404);
      } else {
        res.destroy();
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error("Claim proof photo error:", error);
    return renderErrorPage(res, req, 500, "Unable to load this proof photo.");
  }
};
