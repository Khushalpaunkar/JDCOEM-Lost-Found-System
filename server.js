
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason?.message || reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error?.message || error);
  console.error(error?.stack || "");
  process.exit(1);
});
