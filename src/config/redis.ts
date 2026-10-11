// src/config/redis.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("connect", () => {
    console.log("⚡ Redis client connected successfully");
});

redis.on("error", (err) => {
    console.error("❌ Redis Error:", err);
});

export default redis;