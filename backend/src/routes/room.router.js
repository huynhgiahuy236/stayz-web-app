const express = require("express");

const roomController = require("../controllers/room.controller");
const uploadCloud = require("../middlewares/uploadCloud.middleware");
const protect = require("../middlewares/protect.middleware");
const adminOnly = require("../middlewares/admin.middleware");
const roomRouter = express.Router();

roomRouter.get("/getAll", roomController.getAll);
roomRouter.get("/admin/getAll", protect, adminOnly, roomController.getAllForAdmin);
roomRouter.get("/:propertyId", roomController.getByPropertyId);
roomRouter.post("/create", protect, adminOnly, roomController.create);
roomRouter.put("/update/:id", protect, adminOnly, roomController.update);
roomRouter.delete("/delete/:id", protect, adminOnly, roomController.delete);
roomRouter.patch(
  "/upload/cloud/:id",
  protect,
  adminOnly,
  uploadCloud.single("image"),
  roomController.uploadMainImageCloud,
);
roomRouter.patch(
  "/upload/gallery/cloud/:id",
  protect,
  adminOnly,
  uploadCloud.array("images", 10),
  roomController.uploadGalleryCloud,
);

module.exports = roomRouter;
