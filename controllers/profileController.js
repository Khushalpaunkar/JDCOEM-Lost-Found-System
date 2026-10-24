const mongoose = require("mongoose");
const User = require("../models/User");
const Item = require("../models/item");
const Claim = require("../models/claim");
const FoundReport = require("../models/FoundReport");
const imageStorage = require("../services/imageStorage");

const profileFields = "name collegeId department email mobile address profilePhotoFileId collegeIdPhotoFileId role isActive";

const DEPARTMENTS = ["CSE", "IT", "ECE", "MECH", "CIVIL", "ENTC", ""];

function validateProfileForm(body) {
  const values = {
    name: String(body.name ?? "").trim(),
    department: String(body.department ?? ""),
    mobile: String(body.mobile ?? "").trim(),
    address: String(body.address ?? "").trim()
  };
  const errors = {};

  if (!values.name) {
    errors.name = "Full name is required.";
  } else if (values.name.length < 2 || values.name.length > 60) {
    errors.name = "Name must be between 2 and 60 characters.";
  }

  if (!DEPARTMENTS.includes(values.department)) {
    errors.department = "Select a valid department.";
  }

  if (values.mobile && !/^\d{10}$/.test(values.mobile)) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }

  if (values.address.length > 250) {
    errors.address = "Address must be 250 characters or fewer.";
  }

  return { values, errors };
}

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

    const profileMessages = {
      updated: "Your profile details were updated.",
      save: "Your profile could not be saved. Please try again."
    };

    const flashMessage =
      imageMessages[req.query.imageError] ||
      profileMessages[req.query.profile] ||
      null;
    const flashIsError = !(
      req.query.imageError === "updated" || req.query.profile === "updated"
    );

    // ---- My Activity: fetch everything the logged-in user owns ----
    const userId = req.session.user.id;
    const emptyActivity = { reports: [], claims: [], foundReports: [] };
    let activity = emptyActivity;
    let activityError = null;

    if (!mongoose.isValidObjectId(userId)) {
      activityError = "Your activity could not be loaded right now. Please try again later.";
    } else {
      const [reportsResult, claimsResult, foundReportsResult] = await Promise.allSettled([
        Item.find({ reportedBy: userId })
          .select(
            "title description category status recoveryStatus image location date time createdAt"
          )
          .sort({ createdAt: -1 })
          .lean(),
        Claim.find({ claimedBy: userId })
          .populate("item", "title image status category recoveryStatus")
          .sort({ createdAt: -1 })
          .lean(),
        FoundReport.find({ foundBy: userId })
          .populate("lostItem", "title status image recoveryStatus")
          .sort({ createdAt: -1 })
          .lean()
      ]);

      if (
        reportsResult.status === "rejected" ||
        claimsResult.status === "rejected" ||
        foundReportsResult.status === "rejected"
      ) {
        [reportsResult, claimsResult, foundReportsResult].forEach((result) => {
          if (result.status === "rejected") {
            console.error("Profile activity query failed:", result.reason);
          }
        });
        activityError =
          "Your activity could not be loaded right now. Please try again later.";
      } else {
        activity = {
          reports: reportsResult.value || [],
          claims: claimsResult.value || [],
          foundReports: foundReportsResult.value || []
        };
      }
    }

    return res.render("pages/profile", {
      title: "My Profile | SmartRecover",
      currentUser: req.session.user,
      user,
      flashMessage,
      flashIsError,
      reports: activity.reports,
      claims: activity.claims,
      foundReports: activity.foundReports,
      activityError
    });
  } catch (error) {
    return next(error);
  }
};

exports.showEditProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id).select(profileFields);
    if (!user) {
      return clearStaleSession(req, res);
    }

    return res.render("pages/profile-edit", {
      title: "Edit Profile | SmartRecover",
      currentUser: req.session.user,
      user,
      values: {
        name: user.name || "",
        department: user.department || "",
        mobile: user.mobile || "",
        address: user.address || ""
      },
      errors: {},
      formError: null
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return clearStaleSession(req, res);
    }

    const { values, errors } = validateProfileForm(req.body);

    if (Object.keys(errors).length === 0) {
      user.name = values.name;
      user.department = values.department;
      user.mobile = values.mobile;
      user.address = values.address;

      try {
        await user.save();
        req.session.user.name = user.name;
        return res.redirect("/profile?profile=updated");
      } catch (saveError) {
        if (saveError.name !== "ValidationError") {
          throw saveError;
        }
        Object.keys(saveError.errors || {}).forEach((field) => {
          if (!errors[field]) {
            errors[field] = saveError.errors[field].message;
          }
        });
      }
    }

    return res.status(400).render("pages/profile-edit", {
      title: "Edit Profile | SmartRecover",
      currentUser: req.session.user,
      user,
      values,
      errors,
      formError: "Please review the highlighted fields and try again."
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