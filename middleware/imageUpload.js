const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
    fields: 30,
    parts: 32
  }
});

const claimProofUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fields: 30,
    parts: 36
  }
});

function uploadFields(fields, onError) {
  const parse = upload.fields(fields);
  return (req, res, next) => {
    parse(req, res, (error) => {
      if (error) {
        return onError(req, res, error);
      }
      return next();
    });
  };
}

exports.registrationImages = uploadFields(
  [
    { name: "profilePhoto", maxCount: 1 },
    { name: "collegeIdPhoto", maxCount: 1 }
  ],
  (req, res, error) => {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Each image must be 5 MB or smaller."
      : error.code === "LIMIT_UNEXPECTED_FILE"
        ? "Upload one profile photo and one college ID image only."
        : "The image upload could not be processed. Please try again.";
    return res.status(400).render("auth/register", { error: message, success: null });
  }
);

exports.profileImages = uploadFields(
  [
    { name: "profilePhoto", maxCount: 1 },
    { name: "collegeIdPhoto", maxCount: 1 }
  ],
  (req, res) => res.redirect("/profile?imageError=upload")
);

exports.claimProofPhotos = (req, res, next) => {
  claimProofUpload.array("proofPhotos", 5)(req, res, (error) => {
    if (error) {
      req.claimProofUploadError = error;
    }
    next();
  });
};