const mongoose = require("mongoose");
const User = require("../models/User");
const imageStorage = require("../services/imageStorage");

const profileFields = "name collegeId department email mobile address profilePhotoFileId collegeIdPhotoFileId role";

function canAccessUser(req, user) {
  return req.session.user.role === "admin" ||
    req.session.user.id === user._id.toString();
}

function clearStaleSession(req, res) {
  req.session.destroy(() => {
    res.clearCookie("smartrecover.sid");
    res.redirect("/login");
  });
}

exports.showProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id).select(profileFields);
    if (!user) {
      return clearStaleSession(req, res);
    }

    const imageMessages = {
      updated: "Your images were updated.",
      missing: "Choose at least one image to replace.",
      invalid: "Use a valid JPEG, PNG, or WebP image no larger than 5 MB.",
      upload: "The image upload could not be processed. Check the 5 MB limit and try again.",
      save: "Your images could not be saved. Please try again."
    };

    return res.render("pages/profile", {
      title: "My Profile | SmartRecover",
      currentUser: req.session.user,
      user,
      imageMessage: imageMessages[req.query.imageError] || null,
      imageMessageIsError: req.query.imageError !== "updated"
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateImages = async (req, res) => {
  const uploadedImageIds = [];
  const previousImageIds = [];

  try {
    const profilePhoto = req.files?.profilePhoto?.[0];
    const collegeIdPhoto = req.files?.collegeIdPhoto?.[0];
    if (!profilePhoto && !collegeIdPhoto) {
      return res.redirect("/profile?imageError=missing");
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return clearStaleSession(req, res);
    }

    if (profilePhoto) {
      const newId = await imageStorage.uploadImage(profilePhoto, user._id, "profile-photo");
      uploadedImageIds.push(newId);
      if (user.profilePhotoFileId) previousImageIds.push(user.profilePhotoFileId);
      user.profilePhotoFileId = newId;
    }

    if (collegeIdPhoto) {
      const newId = await imageStorage.uploadImage(collegeIdPhoto, user._id, "college-id");
      uploadedImageIds.push(newId);
      if (user.collegeIdPhotoFileId) previousImageIds.push(user.collegeIdPhotoFileId);
      user.collegeIdPhotoFileId = newId;
    }

    await user.save();
    uploadedImageIds.length = 0;
    await Promise.allSettled(previousImageIds.map(imageStorage.deleteImage));
    return res.redirect("/profile?imageError=updated");
  } catch (error) {
    await Promise.allSettled(uploadedImageIds.map(imageStorage.deleteImage));
    console.error("Profile image update error:", error.message);
    return res.redirect(`/profile?imageError=${error.code === "INVALID_IMAGE" ? "invalid" : "save"}`);
  }
};

exports.showImage = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.sendStatus(404);
    }

    const user = await User.findById(req.params.userId)
      .select("profilePhotoFileId collegeIdPhotoFileId");
    if (!user) {
      return res.sendStatus(404);
    }

    if (!canAccessUser(req, user)) {
      return res.sendStatus(403);
    }

    const imageFields = {
      "profile-photo": user.profilePhotoFileId,
      "college-id": user.collegeIdPhotoFileId
    };
    const imageId = imageFields[req.params.kind];
    if (!imageId) {
      return res.sendStatus(404);
    }

    const stream = await imageStorage.openImage(imageId);
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
    return next(error);
  }
};