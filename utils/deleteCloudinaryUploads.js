const cloudinary = require("../config/cloudinary");

async function deleteCloudinaryUploads(files) {
  const deletions = (files || [])
    .filter((file) => file.filename)
    .map((file) => cloudinary.uploader.destroy(file.filename, { resource_type: "image" }));

  await Promise.allSettled(deletions);
}

module.exports = deleteCloudinaryUploads;
