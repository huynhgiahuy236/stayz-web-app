const authService = require("../services/auth.service");
const { CLIENT_URL } = require("../constants/app.constant");

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

const authController = {
  googleCallback: async (req, res, next) => {
    try {
      const data = await authService.loginGoogle(req.user);
      const clientUrl = CLIENT_URL;

      res.cookie("refreshToken", data.refreshToken, buildRefreshCookieOptions());

      const redirectUrl =
        `${clientUrl}login-success` +
        `?accessToken=${encodeURIComponent(data.accessToken)}` +
        `&email=${encodeURIComponent(data.user.email)}` +
        `&name=${encodeURIComponent(data.user.full_name)}` +
        `&avatar=${encodeURIComponent(data.user.avatar?.url || "")}`;

      res.redirect(redirectUrl);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
