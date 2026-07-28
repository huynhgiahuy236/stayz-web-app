const express = require("express");
const propertiesController = require("../controllers/properties.controller");
const uploadLocalMiddleware = require("../middlewares/uploadLocal.middleware");
const uploadCloud = require("../middlewares/uploadCloud.middleware");
const protect = require("../middlewares/protect.middleware");
const adminOnly = require("../middlewares/admin.middleware");
const propertiesRouter = express.Router();

// Search routes — phải đặt TRƯỚC /:city để không bị match nhầm
propertiesRouter.get("/search", propertiesController.search);
propertiesRouter.get("/search/history", protect, propertiesController.getSearchHistory);
propertiesRouter.delete("/search/history", protect, propertiesController.clearSearchHistory);
propertiesRouter.get("/featured", propertiesController.getFeatured);

propertiesRouter.get("/getAll", propertiesController.getAll);
propertiesRouter.get("/admin/getAll", protect, adminOnly, propertiesController.getAllForAdmin);
propertiesRouter.get("/:city", propertiesController.getCity);
propertiesRouter.get("/:city/:slug", propertiesController.getBySlug);
propertiesRouter.post("/create", protect, adminOnly, propertiesController.create);
propertiesRouter.put("/update/:id", protect, adminOnly, propertiesController.update);
propertiesRouter.delete("/delete/:id", protect, adminOnly, propertiesController.delete);
propertiesRouter.patch(
  "/upload/local/:id",
  protect,
  adminOnly,
  uploadLocalMiddleware.single("image"),
  propertiesController.uploadMainImageLocal,
);
propertiesRouter.patch(
  "/upload/cloud/:id",
  protect,
  adminOnly,
  uploadCloud.single("image"),
  propertiesController.uploadMainImageCloud,
);
propertiesRouter.patch(
  "/upload/gallery/cloud/:id",
  protect,
  adminOnly,
  uploadCloud.array("images", 10),
  propertiesController.uploadGalleryCloud,
);

module.exports = propertiesRouter;
