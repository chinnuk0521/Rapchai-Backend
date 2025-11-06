import Redis from "ioredis";
import { env } from "./env.js";

// Check if Redis should be enabled (not localhost in production)
const isRedisEnabled = (): boolean => {
  const redisUrl = env.REDIS_URL || "";
  // Skip Redis if it's localhost in production (serverless environments)
  if (env.NODE_ENV === "production" && redisUrl.includes("localhost")) {
    return false;
  }
  return true;
};

// Create Redis instances only if enabled
let redis: Redis | null = null;
let pubRedis: Redis | null = null;
let subRedis: Redis | null = null;

function createRedisInstances(): void {
  if (!isRedisEnabled()) {
    return;
  }

  const redisOptions = {
    ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 5000,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      // Don't retry in serverless environments
      if (env.NODE_ENV === "production") {
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  redis = new Redis(env.REDIS_URL, redisOptions);
  pubRedis = new Redis(env.REDIS_URL, redisOptions);
  subRedis = new Redis(env.REDIS_URL, redisOptions);

  // Add error handlers to prevent unhandled errors
  const handleError = (error: Error, instance: string) => {
    console.warn(`⚠️ Redis ${instance} error (non-fatal):`, error.message);
  };

  redis.on("error", (error) => handleError(error, "redis"));
  pubRedis.on("error", (error) => handleError(error, "pubRedis"));
  subRedis.on("error", (error) => handleError(error, "subRedis"));
}

// Initialize Redis instances
createRedisInstances();

// Export getters that return null if Redis is disabled
export const getRedis = () => redis;
export const getPubRedis = () => pubRedis;
export const getSubRedis = () => subRedis;

export async function connectRedis(): Promise<void> {
  if (!isRedisEnabled()) {
    console.log("ℹ️ Redis disabled (localhost in production)");
    return;
  }

  if (!redis || !pubRedis || !subRedis) {
    console.warn("⚠️ Redis instances not initialized");
    return;
  }

  try {
    await Promise.all([
      redis.connect(),
      pubRedis.connect(),
      subRedis.connect(),
    ]);
    console.log("✅ Redis connected successfully");
  } catch (error: any) {
    console.warn(
      "⚠️ Redis connection failed, continuing without Redis:",
      error?.message || error,
    );
    // Don't throw error, just log warning
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!isRedisEnabled() || !redis || !pubRedis || !subRedis) {
    return;
  }

  try {
    await Promise.all([
      redis.disconnect(),
      pubRedis.disconnect(),
      subRedis.disconnect(),
    ]);
    console.log("✅ Redis disconnected successfully");
  } catch (error) {
    console.warn("⚠️ Redis disconnection failed (non-fatal):", error);
    // Don't throw error in production
  }
}

export async function healthCheckRedis(): Promise<boolean> {
  if (!isRedisEnabled() || !redis) {
    return false;
  }

  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.warn("⚠️ Redis health check failed:", error);
    return false;
  }
}

// Cache helper functions
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisEnabled() || !redis) {
      return null;
    }

    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn("Cache get error (non-fatal):", error);
      return null;
    }
  }

  static async set(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<void> {
    if (!isRedisEnabled() || !redis) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      console.warn("Cache set error (non-fatal):", error);
    }
  }

  static async del(key: string): Promise<void> {
    if (!isRedisEnabled() || !redis) {
      return;
    }

    try {
      await redis.del(key);
    } catch (error) {
      console.warn("Cache delete error (non-fatal):", error);
    }
  }

  static async exists(key: string): Promise<boolean> {
    if (!isRedisEnabled() || !redis) {
      return false;
    }

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.warn("Cache exists error (non-fatal):", error);
      return false;
    }
  }

  static async flush(): Promise<void> {
    if (!isRedisEnabled() || !redis) {
      return;
    }

    try {
      await redis.flushdb();
    } catch (error) {
      console.warn("Cache flush error (non-fatal):", error);
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    if (!isRedisEnabled() || !redis) {
      return;
    }

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.warn("Cache delete pattern error (non-fatal):", error);
    }
  }
}
