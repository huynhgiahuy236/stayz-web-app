const express = require("express");
const aiController = require("../controllers/ai.controller");
const protect = require("../middlewares/protect.middleware");

const aiRouter = express.Router();

aiRouter.post("/chat", protect, aiController.chat);

module.exports = aiRouter;
