const redis = require("../config/redis.config");

/**
 * Rate limiter middleware dùng Redis counter + TTL
 * @param {number} maxRequests - Số lần tối đa được phép trong khoảng thời gian
 * @param {number} windowSeconds - Khoảng thời gian tính bằng giây
 */
const rateLimiter = (maxRequests, windowSeconds) => {
  return async (req, res, next) => {
    try {
      const key = `rate:${req.ip}:${req.path}`;

      // Tăng counter lên 1
      const current = await redis.incr(key);

      // Lần đầu tiên → set TTL
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        return res.status(429).json({
          message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${windowSeconds} giây.`,
          retryAfter: windowSeconds,
        });
      }

      next();
    } catch (err) {
      // Nếu Redis lỗi → cho phép request tiếp tục (không chặn user)
      console.error("RateLimit Redis error:", err.message);
      next();
    }
  };
};

module.exports = { rateLimiter };
