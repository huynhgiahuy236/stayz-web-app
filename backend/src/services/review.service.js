const reviewsModel = require("../models/reviews.model");
const bookingModel = require("../models/bookings.model");
const { BadRequestException, ForbiddenException } = require("../helpers/error.helper");

const assertReviewOwnership = (review, user) => {
  const isOwner = review.user_id?.toString() === user?.userId?.toString();
  if (!isOwner && user?.role !== "admin") {
    throw new ForbiddenException("Ban khong co quyen thay doi danh gia nay");
  }
};

const assertReviewEditOwnership = (review, user) => {
  const isOwner = review.user_id?.toString() === user?.userId?.toString();
  if (!isOwner) {
    throw new ForbiddenException("Chi nguoi viet moi duoc sua danh gia");
  }
};

const reviewService = {
  getAll: async (propertyId) => {
    const query = {};
    if (propertyId) {
      query.property_id = propertyId;
    }
    return await reviewsModel
      .find(query)
      .populate("user_id", "avatar full_name role")
      .populate("property_id", "title slug city user_id");
  },
  create: async (data) => {
    const { user_id, property_id, booking_id, rating, comment } = data;
    if (!user_id || !property_id || !booking_id) {
      throw new BadRequestException("Thieu user, property hoac booking");
    }

    const booking = await bookingModel.findOne({
      _id: booking_id,
      user_id,
      property_id,
      status: "completed",
    });
    if (!booking) {
      throw new BadRequestException("Chi co the danh gia booking da hoan tat cua ban");
    }

    // Chan danh gia trung: moi don chi duoc danh gia mot lan.
    const existing = await reviewsModel.findOne({ booking_id, user_id });
    if (existing) {
      throw new BadRequestException("Ban da danh gia don nay roi");
    }

    const safeRating = Number(rating);
    if (!Number.isFinite(safeRating) || safeRating < 1 || safeRating > 5) {
      throw new BadRequestException("Rating phai tu 1 den 5 sao");
    }

    const review = await reviewsModel.create({
      user_id: user_id,
      property_id: property_id,
      booking_id,
      rating: safeRating,
      comment: comment,
    });
    return review;
  },
  update: async (id, data, user) => {
    const { rating, comment } = data;
    const review = await reviewsModel.findById(id);
    if (!review) return null;

    assertReviewEditOwnership(review, user);

    if (rating != null) {
      const safeRating = Number(rating);
      if (!Number.isFinite(safeRating) || safeRating < 1 || safeRating > 5) {
        throw new BadRequestException("Rating phai tu 1 den 5 sao");
      }
      review.rating = safeRating;
    }

    if (comment != null) review.comment = String(comment).trim();
    await review.save();

    return await reviewsModel
      .findById(id)
      .populate("user_id", "avatar full_name role")
      .populate("property_id", "title slug city user_id");
  },
  delete: async (id, user) => {
    const review = await reviewsModel.findById(id);
    if (!review) return null;
    assertReviewOwnership(review, user);
    return await reviewsModel.findByIdAndDelete(id);
  },
};
module.exports = reviewService;
