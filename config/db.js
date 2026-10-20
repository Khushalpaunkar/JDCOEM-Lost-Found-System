
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB Atlas connected successfully");
}

module.exports = connectDB;
