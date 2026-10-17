require("dotenv").config();

const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const authRoutes = require("./Routes/authRoutes");
const itemRoutes = require("./Routes/itemRoutes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "blob:"]
      }
    }
  })
);

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    name: "smartrecover.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Static files
app.use(express.static(path.join(__dirname, "public")));


// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart Asset Recovery System is running",
  });
});

// Home page
app.get("/", (req, res) => {
  res.render("pages/home", {
    title: "SmartRecover | Lost & Found",
    currentUser: req.session.user || null
  });
});



// Item management routes
app.use("/", itemRoutes);

// Authentication routes
app.use("/", authRoutes);


module.exports = app;
