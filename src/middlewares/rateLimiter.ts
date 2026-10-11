// src/middlewares/rateLimiter.ts
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../config/redis";

const isTestEnv = process.env.NODE_ENV === "test";

export const authLimiter = rateLimit({
    skip: () => isTestEnv,
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
        prefix: "rl:auth:",
    }),
    message: {
        status: "fail",
        message: "Too many login/register attempts. Please try again after 15 minutes.",
    },
});

export const apiLimiter = rateLimit({
    skip: () => isTestEnv, 
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
        prefix: "rl:general:",
    }),
    message: {
        status: "fail",
        message: "Too many requests from this IP, please try again after 15 minutes.",
    },
});