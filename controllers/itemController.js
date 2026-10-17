
const Item = require("../models/item");

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
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    const {
      title,
      description,
      category,
      status,
      location,
      date,
      time
    } = req.body;

    if (!["lost", "found"].includes(status)) {
      return res.status(400).send("Invalid report type.");
    }

    const reportedBy = user._id || user.id;

    if (!reportedBy) {
      return res.status(401).send(
        "Please log in again. User ID is missing from your session."
      );
    }

    // Only persist secure Cloudinary URLs returned by Multer.
    const uploadedFiles = req.files || [];
    const imageUrls = uploadedFiles.map((file) => file.path);
    const hasInvalidImageUrl = imageUrls.some((imageUrl) => {
      try {
        const parsedUrl = new URL(imageUrl);
        return parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com";
      } catch {
        return true;
      }
    });

    if (hasInvalidImageUrl) {
      console.error("Report upload completed without valid secure Cloudinary URLs", {
        uploadedFileCount: uploadedFiles.length
      });
      return res.status(502).send(
        "One or more images could not be uploaded. Please try again."
      );
    }

    const item = new Item({
      title,
      description,
      category,
      status,
      location,
      date: date || Date.now(),
      time,
      reportedBy,
      image: imageUrls,
      recoveryStatus: "open"
    });

    await item.save();

    return res.redirect("/");
  } catch (error) {
    console.error("Create item error:", error);

    return res.status(500).send(
      "Unable to submit your report. Please try again."
    );
  }
};


// GET /items — Display items from MongoDB Atlas
exports.getAllItems = async (req, res) => {
  try {
    const filter = {};

    if (["lost", "found"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    filter.recoveryStatus = "open";

    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.render("items/index", {
      title: "Browse Items | SmartRecover",
      currentUser: req.session.user || null,
      items,
      selectedStatus: req.query.status || "",
      selectedCategory: req.query.category || ""
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

    const item = await Item.findById(req.params.id).lean();

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
