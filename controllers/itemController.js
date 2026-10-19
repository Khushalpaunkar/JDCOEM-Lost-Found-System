
const mongoose = require("mongoose");
const Item = require("../models/item");
const deleteCloudinaryUploads = require("../utils/deleteCloudinaryUploads");

const allowedCategories = Item.schema.path("category").enumValues;

function getUserId(req) {
  return req.session?.user?._id || req.session?.user?.id;
}

function reportError(message) {
  const error = new Error(message);
  error.code = "INVALID_REPORT";
  return error;
}

function validateReportInput(body, status) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "").trim();
  const location = String(body.location || "").trim();
  const time = String(body.time || "").trim();
  const rawDate = String(body.date || "").trim();
  const date = rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : new Date();

  if (!title || title.length > 100) {
    throw reportError("Enter an item name no longer than 100 characters.");
  }
  if (!description || description.length > 2000) {
    throw reportError("Enter item details no longer than 2,000 characters.");
  }
  if (!allowedCategories.includes(category)) {
    throw reportError("Choose a valid item category.");
  }
  if (!location || location.length > 200) {
    throw reportError("Enter a location no longer than 200 characters.");
  }
  if (rawDate && (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== rawDate
  )) {
    throw reportError("Enter a valid report date.");
  }
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw reportError("Enter a valid report time.");
  }
  if (!["lost", "found"].includes(status)) {
    throw reportError("Choose a valid report type.");
  }

  return { title, description, category, location, date, time, status };
}

async function createItemReport(req, status) {
  const reportedBy = getUserId(req);
  if (!mongoose.isValidObjectId(reportedBy)) {
    throw reportError("Please log in again before submitting a report.");
  }

  const fields = validateReportInput(req.body, status);
  const imageUrls = (req.files || []).map((file) => file.path);
  const hasInvalidImageUrl = imageUrls.some((imageUrl) => {
    try {
      const parsedUrl = new URL(imageUrl);
      return parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com";
    } catch {
      return true;
    }
  });

  if (hasInvalidImageUrl) {
    throw reportError("One or more photos could not be uploaded. Please try again.");
  }

  const item = new Item({
    ...fields,
    reportedBy,
    image: imageUrls,
    recoveryStatus: "open"
  });
  await item.save();
  return item;
}

function renderReportForm(res, req, options = {}) {
  return res.status(options.status || 200).render("items/report", {
    title: options.title || "Report an Item | SmartRecover",
    currentUser: req.session.user || null,
    error: options.error || null
  });
}

// GET /report — Single Lost/Found report page
exports.showReportForm = (req, res) => {
  res.render("items/report", {
    title: "Report an Item | SmartRecover",
    currentUser: req.session.user || null,
    error: null
  });
};






// POST /report — Save a new report
exports.createItem = async (req, res) => {
  try {
    const item = await createItemReport(req, req.body.status);
    return res.redirect("/");
  } catch (error) {
    console.error("Create item error:", error);
    await deleteCloudinaryUploads(req.files);
    const status = error.code === "INVALID_REPORT" || error.name === "ValidationError" ? 400 : 500;
    return renderReportForm(res, req, {
      status,
      error: status === 400 ? error.message : "Unable to submit your report. Please try again."
    });
  }
};

// GET /items — Display items from MongoDB Atlas
exports.getAllItems = async (req, res) => {
  try {
    const queryValue = (value) => typeof value === "string" ? value.trim() : "";
    const selectedSearch = queryValue(req.query.search).slice(0, 100);
    const requestedStatus = queryValue(req.query.status);
    const selectedStatus = ["lost", "found"].includes(requestedStatus)
      ? requestedStatus
      : "";
    const requestedCategory = queryValue(req.query.category);
    const selectedCategory = allowedCategories.includes(requestedCategory)
      ? requestedCategory
      : "";
    const selectedLocation = queryValue(req.query.location).slice(0, 200);
    const filter = { recoveryStatus: "open" };

    if (selectedStatus) filter.status = selectedStatus;
    if (selectedCategory) filter.category = selectedCategory;
    if (selectedLocation) {
      filter.location = new RegExp(`^${selectedLocation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    }
    if (selectedSearch) {
      const searchRegex = new RegExp(
        selectedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = ["title", "description", "category", "location"].map((field) => ({
        [field]: searchRegex
      }));
    }

    const [items, locations] = await Promise.all([
      Item.find(filter).sort({ createdAt: -1 }).lean(),
      Item.distinct("location", { recoveryStatus: "open" })
    ]);

    return res.render("items/index", {
      title: "Browse Items | SmartRecover",
      currentUser: req.session.user || null,
      items,
      categories: allowedCategories,
      locations: locations.sort((a, b) => a.localeCompare(b)),
      selectedSearch,
      selectedStatus,
      selectedCategory,
      selectedLocation
    });
  } catch (error) {
    console.error("Fetch items error:", error);
    res.status(500).send("Unable to load items right now.");
  }
};



// GET /items/:id — Display one item's details
exports.getItemDetails = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).send("Invalid item ID.");
    }

    const item = await Item.findById(req.params.id)
      .populate({
        path: "reportedBy",
        select: "name department mobile collegeId"
      })
      .lean();

    if (!item) {
      return res.status(404).send("Item not found.");
    }

    res.render("items/details", {
      title: `${item.title} | SmartRecover`,
      currentUser: req.session.user || null,
      item
    });
  } catch (error) {
    console.error("Item details error:", error);
    res.status(500).send("Unable to load item details.");
  }
};
