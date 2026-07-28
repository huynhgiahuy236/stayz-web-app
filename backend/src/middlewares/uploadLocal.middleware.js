const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const propertyId = req.params.id;
    const relativeParts = req.baseUrl?.endsWith("/users")
      ? ["avatars"]
      : ["properties", propertyId, "main"];
    const uploadDir = path.join(__dirname, "..", "images", ...relativeParts);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extByMime = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const ext = extByMime[file.mimetype] || path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

module.exports = multer({
  storage,
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
