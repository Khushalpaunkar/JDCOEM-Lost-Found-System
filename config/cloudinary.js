
const cloudinary = require("cloudinary").v2;

const requiredEnvironmentVariables = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (name) => !process.env[name]?.trim()
);

if (missingEnvironmentVariables.length > 0) {
  console.error(
    `Cloudinary configuration is missing environment variables: ${missingEnvironmentVariables.join(", ")}`
  );
} else {
  console.info("Cloudinary environment variables are present; values are redacted.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
