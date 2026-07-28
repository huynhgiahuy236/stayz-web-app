const express = require("express");

const reviewController = require("../controllers/review.controller");
const protect = require("../middlewares/protect.middleware");
const adminAudit = require("../middlewares/adminAudit.middleware");
const reviewRouter = express.Router();

reviewRouter.get("/getAll", reviewController.getAll);
reviewRouter.post("/create", protect, reviewController.create);
reviewRouter.put("/update/:id", protect, reviewController.update);
reviewRouter.delete("/delete/:id", protect, adminAudit, reviewController.delete);

module.exports = reviewRouter;
