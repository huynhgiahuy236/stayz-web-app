const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const parsedRedisUrl = new URL(redisUrl);
const shouldUseTls =
  parsedRedisUrl.protocol === "rediss:" ||
  parsedRedisUrl.hostname.includes("upstash.io");

const redis = new Redis(redisUrl, {
  ...(shouldUseTls ? { tls: {} } : {}),
  lazyConnect: false,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 500, 2000);
  },
});

let redisConnected = false;
let lastRedisError = null;

redis.on("connect", () => {
  redisConnected = true;
  lastRedisError = null;
  console.log("Redis connected");
});

redis.on("close", () => {
  redisConnected = false;
});

redis.on("error", (err) => {
  lastRedisError = err.message;
  console.error("Redis error:", err.message);
});

const safeCommands = new Set([
  "del",
  "expire",
  "get",
  "incr",
  "lpush",
  "lrange",
  "ltrim",
  "set",
  "setex",
]);

const safeRedis = new Proxy(redis, {
  get(target, prop) {
    if (prop === "health") {
      return () => ({
        configured: Boolean(process.env.REDIS_URL),
        connected: redisConnected,
        tls: shouldUseTls,
        host: parsedRedisUrl.hostname,
        last_error: lastRedisError,
      });
    }

    const value = target[prop];
    if (typeof value !== "function") return value;

    if (!safeCommands.has(prop)) {
      return value.bind(target);
    }

    return async (...args) => {
      try {
        return await value.apply(target, args);
      } catch (err) {
        console.warn(`Redis ${prop} skipped:`, err.message);
        if (prop === "incr") return 1;
        return null;
      }
    };
  },
});

module.exports = safeRedis;
