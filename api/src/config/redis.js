"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = exports.subRedis = exports.pubRedis = exports.redis = void 0;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.healthCheckRedis = healthCheckRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const env_js_1 = require("./env.js");
exports.redis = new ioredis_1.default(env_js_1.env.REDIS_URL, {
    ...(env_js_1.env.REDIS_PASSWORD && { password: env_js_1.env.REDIS_PASSWORD }),
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 5000,
    enableOfflineQueue: false,
});
exports.pubRedis = new ioredis_1.default(env_js_1.env.REDIS_URL, {
    ...(env_js_1.env.REDIS_PASSWORD && { password: env_js_1.env.REDIS_PASSWORD }),
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 5000,
    enableOfflineQueue: false,
});
exports.subRedis = new ioredis_1.default(env_js_1.env.REDIS_URL, {
    ...(env_js_1.env.REDIS_PASSWORD && { password: env_js_1.env.REDIS_PASSWORD }),
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 5000,
    enableOfflineQueue: false,
});
async function connectRedis() {
    try {
        await Promise.all([
            exports.redis.connect(),
            exports.pubRedis.connect(),
            exports.subRedis.connect(),
        ]);
        console.log("✅ Redis connected successfully");
    }
    catch (error) {
        console.warn("⚠️ Redis connection failed, continuing without Redis:", error?.message || error);
        // Don't throw error, just log warning
    }
}
async function disconnectRedis() {
    try {
        await Promise.all([
            exports.redis.disconnect(),
            exports.pubRedis.disconnect(),
            exports.subRedis.disconnect(),
        ]);
        console.log("✅ Redis disconnected successfully");
    }
    catch (error) {
        console.error("❌ Redis disconnection failed:", error);
        throw error;
    }
}
async function healthCheckRedis() {
    try {
        await exports.redis.ping();
        return true;
    }
    catch (error) {
        console.error("❌ Redis health check failed:", error);
        return false;
    }
}
// Cache helper functions
class CacheService {
    static async get(key) {
        try {
            const value = await exports.redis.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error("Cache get error:", error);
            return null;
        }
    }
    static async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await exports.redis.setex(key, ttlSeconds, serialized);
            }
            else {
                await exports.redis.set(key, serialized);
            }
        }
        catch (error) {
            console.error("Cache set error:", error);
        }
    }
    static async del(key) {
        try {
            await exports.redis.del(key);
        }
        catch (error) {
            console.error("Cache delete error:", error);
        }
    }
    static async exists(key) {
        try {
            const result = await exports.redis.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error("Cache exists error:", error);
            return false;
        }
    }
    static async flush() {
        try {
            await exports.redis.flushdb();
        }
        catch (error) {
            console.error("Cache flush error:", error);
        }
    }
    static async delPattern(pattern) {
        try {
            const keys = await exports.redis.keys(pattern);
            if (keys.length > 0) {
                await exports.redis.del(...keys);
            }
        }
        catch (error) {
            console.error("Cache delete pattern error:", error);
        }
    }
}
exports.CacheService = CacheService;
