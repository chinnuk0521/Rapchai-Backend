import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 5000,
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,
});
  
export const pubRedis = new Redis(env.REDIS_URL, {
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 5000,
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,
});

export const subRedis = new Redis(env.REDIS_URL, {
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 5000,
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,
});

export async function connectRedis(): Promise<void> {
  try {
    await Promise.all([
      redis.connect(),
      pubRedis.connect(),
      subRedis.connect(),
    ]);
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.warn('⚠️ Redis connection failed, continuing without Redis:', error.message);
    // Don't throw error, just log warning
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await Promise.all([
      redis.disconnect(),
      pubRedis.disconnect(),
      subRedis.disconnect(),
    ]);
    console.log('✅ Redis disconnected successfully');
  } catch (error) {
    console.error('❌ Redis disconnection failed:', error);
    throw error;
  }
}

export async function healthCheckRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}

// Cache helper functions
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  static async flush(): Promise<void> {
    try {
      await redis.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }
}
