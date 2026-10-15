const crypto = require("crypto");
const mongoose = require("mongoose");
const sharp = require("sharp");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");

const BUCKET_NAME = "userImages";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

let cachedDb;
let cachedBucket;

class ImageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageValidationError";
    this.code = "INVALID_IMAGE";
  }
}

function getBucket() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Image storage is not connected to MongoDB.");
  }

  if (db !== cachedDb) {
    cachedDb = db;
    cachedBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
  }

  return cachedBucket;
}

async function normalizeImage(file) {
  if (!file?.buffer || file.buffer.length > MAX_FILE_SIZE) {
    throw new ImageValidationError("Each image must be 5 MB or smaller.");
  }

  try {
    const input = sharp(file.buffer, {
      failOn: "error",
      limitInputPixels: 40_000_000
    });
    const metadata = await input.metadata();

    if (!ALLOWED_FORMATS.has(metadata.format) || (metadata.pages || 1) > 1) {
      throw new ImageValidationError("Upload a single-frame JPEG, PNG, or WebP image.");
    }

    const buffer = await sharp(file.buffer, {
      failOn: "error",
      limitInputPixels: 40_000_000
    })
      .rotate()
      .webp({ quality: 82 })
      .toBuffer();

    if (buffer.length > MAX_FILE_SIZE) {
      throw new ImageValidationError("The processed image exceeds the 5 MB limit.");
    }

    return buffer;
  } catch (error) {
    if (error instanceof ImageValidationError) {
      throw error;
    }

    throw new ImageValidationError("The uploaded file is not a valid supported image.");
  }
}

async function uploadImage(file, ownerId, purpose) {
  const buffer = await normalizeImage(file);
  const imageBucket = getBucket();
  const id = new mongoose.Types.ObjectId();
  const uploadStream = imageBucket.openUploadStream(
    `${purpose}-${crypto.randomUUID()}.webp`,
    {
      id,
      contentType: "image/webp",
      metadata: {
        ownerId: new mongoose.Types.ObjectId(ownerId),
        purpose,
        contentType: "image/webp"
      }
    }
  );

  try {
    await pipeline(Readable.from([buffer]), uploadStream);
    return id;
  } catch (error) {
    await deleteImage(id).catch(() => {});
    throw error;
  }
}

async function deleteImage(fileId) {
  if (!fileId || !mongoose.connection.db) {
    return;
  }

  const id = new mongoose.Types.ObjectId(fileId);
  const db = mongoose.connection.db;
  await Promise.all([
    db.collection(`${BUCKET_NAME}.files`).deleteOne({ _id: id }),
    db.collection(`${BUCKET_NAME}.chunks`).deleteMany({ files_id: id })
  ]);
}

async function openImage(fileId) {
  if (!mongoose.isValidObjectId(fileId)) {
    return null;
  }

  const id = new mongoose.Types.ObjectId(fileId);
  const imageBucket = getBucket();
  const file = await imageBucket.find({ _id: id }).limit(1).next();
  const isWebp = file?.metadata?.contentType === "image/webp" ||
    file?.filename?.toLowerCase().endsWith(".webp");
  if (!file || !isWebp) {
    return null;
  }

  return imageBucket.openDownloadStream(id);
}

module.exports = {
  ImageValidationError,
  MAX_FILE_SIZE,
  deleteImage,
  openImage,
  uploadImage
};