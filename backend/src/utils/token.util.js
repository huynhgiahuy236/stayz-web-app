const jwt = require("jsonwebtoken");
const { SECRET, REFRESH_SECRET } = require("../constants/app.constant");

const generateAccessToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role_user: user.role,
    },
    SECRET,
    { expiresIn: "1d" },
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
    },
    REFRESH_SECRET,
    { expiresIn: "7d" },
  );

const generateAuthTokens = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});

const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

const verifyAccessToken = (token) => jwt.verify(token, SECRET);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateAuthTokens,
  verifyRefreshToken,
  verifyAccessToken,
};
