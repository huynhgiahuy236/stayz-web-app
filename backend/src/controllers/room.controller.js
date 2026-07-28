const { responseSuccess } = require("../helpers/response.helper");
const roomService = require("../services/room.service");

const roomController = {
  getAll: async (req, res, next) => {
    try {
      const data = await roomService.getAll(req.query);
      const response = responseSuccess(data, "Lấy room thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getAllForAdmin: async (req, res, next) => {
    try {
      const data = await roomService.getAll(req.query, { includeInactive: true });
      const response = responseSuccess(data, "Lay tat ca room cho admin thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getByPropertyId: async (req, res, next) => {
    const propertyId = req.params.propertyId;
    try {
      const data = await roomService.getByPropertyId(propertyId, req.query);
      const response = responseSuccess(data, "Lấy room thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    const newRoom = req.body;
    try {
      const data = await roomService.create(newRoom);
      const response = responseSuccess(data, "Tạo room thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    const id = req.params.id;
    const body = req.body;
    try {
      const data = await roomService.update(id, body);
      const response = responseSuccess(data, "Cập nhật room thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  delete: async (req, res, next) => {
    const id = req.params.id;
    try {
      const data = await roomService.delete(id);
      const response = responseSuccess(data, "Xóa room thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  uploadMainImageCloud: async (req, res, next) => {
    try {
      const data = await roomService.uploadMainImageCloud(req.params.id, req.file);
      const response = responseSuccess(data, "Tải ảnh phòng lên Cloudinary thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  uploadGalleryCloud: async (req, res, next) => {
    try {
      const data = await roomService.uploadGalleryCloud(req.params.id, req.files);
      const response = responseSuccess(data, "Tải thư viện ảnh phòng lên Cloudinary thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = roomController;
