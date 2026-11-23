
const mongoose = require("mongoose");

let connectionPromise = null;

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from the environment");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
      })
      .then(() => {
        console.log("MongoDB Atlas connected successfully");
        return mongoose.connection;
      })
      .finally(() => {
        connectionPromise = null;
      });
  }

  return connectionPromise;
}

module.exports = connectDB;
