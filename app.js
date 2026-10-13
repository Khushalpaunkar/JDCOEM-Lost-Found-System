const express = require("express");
const path = require("path");
const helmet = require("helmet");

const app = express();
const expressLayouts = require("express-ejs-layouts");


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/main");

app.use(expressLayouts);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart Asset Recovery System is running",
  });
});

app.get("/", (req, res) => {
  res.render("pages/home", {
    title: "SmartRecover | Lost & Found",
  });
});


module.exports = app;