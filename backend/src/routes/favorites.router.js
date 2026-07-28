const express = require("express");
const favoritesController = require("../controllers/favorites.controller");
const protect = require("../middlewares/protect.middleware");

const favoritesRouter = express.Router();

// Tất cả route favorites đều yêu cầu đăng nhập
favoritesRouter.use(protect);

favoritesRouter.get("/", favoritesController.getMyFavorites);
favoritesRouter.get("/check/:propertyId", favoritesController.checkIsFavorite);
favoritesRouter.post("/:propertyId", favoritesController.add);
favoritesRouter.delete("/:propertyId", favoritesController.remove);

module.exports = favoritesRouter;
