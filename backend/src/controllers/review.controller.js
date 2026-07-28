const { responseSuccess } = require("../helpers/response.helper");
const reviewService = require("../services/review.service");

const reviewController = {
  getAll: async (req, res, next) => {
    try {
      const { propertyId } = req.query;
      const data = await reviewService.getAll(propertyId);
      const response = responseSuccess(
        data,
        "Lấy danh sách review thành công",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    const newReview = { ...req.body, user_id: req.user?.userId };
    try {
      const data = await reviewService.create(newReview);
      const response = responseSuccess(data, "Tạo review thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    const reviewId = req.params.id;
    const payload = req.body;
    try {
      const data = await reviewService.update(reviewId, payload, req.user);
      const response = responseSuccess(data, "Cập nhật thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  delete: async (req, res, next) => {
    const reviewId = req.params.id;
    try {
      const data = await reviewService.delete(reviewId, req.user);
      const response = responseSuccess(data, "Xóa thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
};
module.exports = reviewController;
