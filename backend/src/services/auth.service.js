const bcrypt = require("bcrypt");

const { BadRequestException } = require("../helpers/error.helper");
const usersModel = require("../models/users.model");
const { generateAuthTokens } = require("../utils/token.util");

const authService = {
  loginGoogle: async (profile) => {
    const email = profile?.emails?.[0]?.value;

    if (!email) {
      throw new Error("Tai khoan Google khong co email");
    }

    let user = await usersModel.findOne({ email });

    if (!user) {
      const randomPassword = await bcrypt.hash(
        `google_${Date.now()}_${Math.random()}`,
        10,
      );

      user = await usersModel.create({
        email,
        password: randomPassword,
        full_name: profile.displayName || email.split("@")[0],
        avatar: {
          url: profile?.photos?.[0]?.value || "",
          public_id: "",
        },
        role: "user",
        provider: "google",
        googleId: profile.id,
      });
    }

    const { accessToken, refreshToken } = generateAuthTokens(user);

    return {
      accessToken,
      refreshToken,
      user,
    };
  },
};

module.exports = authService;
