const authService = require("../services/auth.service");
const { CLIENT_URL, WEB_CLIENT_URL } = require("../constants/app.constant");

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

const authController = {
  googleCallback: async (req, res, next) => {
    try {
      const data = await authService.loginGoogle(req.user);
      const isWebLogin = req.query.state === "web";
      const clientUrl = isWebLogin ? WEB_CLIENT_URL : CLIENT_URL;
      if (!clientUrl) {
        throw new Error(
          isWebLogin
            ? "WEB_CLIENT_URL chua duoc cau hinh"
            : "CLIENT_URL chua duoc cau hinh",
        );
      }

      res.cookie("refreshToken", data.refreshToken, buildRefreshCookieOptions());

      const callbackPath = "/login-success";
      const redirectUrl =
        `${clientUrl.replace(/\/$/, "")}${callbackPath}` +
        `?accessToken=${encodeURIComponent(data.accessToken)}` +
        `&refreshToken=${encodeURIComponent(data.refreshToken)}` +
        `&userId=${encodeURIComponent(data.user._id.toString())}` +
        `&email=${encodeURIComponent(data.user.email)}` +
        `&name=${encodeURIComponent(data.user.full_name)}` +
        `&role=${encodeURIComponent(data.user.role || "user")}` +
        `&avatar=${encodeURIComponent(data.user.avatar?.url || "")}`;

      res.redirect(redirectUrl);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
