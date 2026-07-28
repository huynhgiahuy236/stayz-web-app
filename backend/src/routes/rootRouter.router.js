const express = require("express");
const userRouter = require("./users.router");
const authRouter = require("./auth.router");

const propertiesRouter = require("./properties.router");
const reviewRouter = require("./review.router");
const roomRouter = require("./room.router");
const bookingRouter = require("./booking.router");
const favoritesRouter = require("./favorites.router");
const notificationsRouter = require("./notifications.router");
const chatRouter = require("./chat.router");
const paymentRouter = require("./payment.router");
const aiRouter = require("./ai.router");

const rootRouter = express.Router();

rootRouter.use("/users", userRouter);
rootRouter.use("/auth", authRouter);

rootRouter.use("/properties", propertiesRouter);
rootRouter.use("/review", reviewRouter);
rootRouter.use("/room", roomRouter);
rootRouter.use("/booking", bookingRouter);
rootRouter.use("/favorites", favoritesRouter);
rootRouter.use("/notifications", notificationsRouter);
rootRouter.use("/chat", chatRouter);
rootRouter.use("/payment", paymentRouter);
rootRouter.use("/ai", aiRouter);

module.exports = rootRouter;
