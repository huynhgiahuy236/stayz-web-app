const express = require("express");
const passport = require("passport");
const authController = require("../controllers/auth.controller");

const authRouter = express.Router();

authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  authController.googleCallback,
);

module.exports = authRouter;
