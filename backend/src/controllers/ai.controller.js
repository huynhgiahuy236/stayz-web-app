const aiService = require("../services/ai.service");

const aiController = {
  chat: async (req, res, next) => {
    try {
      const data = await aiService.chat({
        userId: req.user.userId,
        body: req.body,
      });
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = aiController;
