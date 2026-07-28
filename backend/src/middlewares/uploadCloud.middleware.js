const multer = require("multer");

const uploadCloud = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype?.startsWith("image/")) {
      const error = new Error("Chi chap nhan tep hinh anh");
      error.code = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

module.exports = uploadCloud;
