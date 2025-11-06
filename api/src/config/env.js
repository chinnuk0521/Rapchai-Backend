"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: zod_1.z.string().transform(Number).default("3001"),
    HOST: zod_1.z.string().default("0.0.0.0"),
    // Database
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    // Redis
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: zod_1.z
        .string()
        .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: zod_1.z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default("7d"),
    // Password Hashing
    ARGON2_MEMORY_COST: zod_1.z.string().transform(Number).default("65536"),
    ARGON2_TIME_COST: zod_1.z.string().transform(Number).default("3"),
    ARGON2_PARALLELISM: zod_1.z.string().transform(Number).default("1"),
    // Rate Limiting
    RATE_LIMIT_MAX: zod_1.z.string().transform(Number).default("100"),
    RATE_LIMIT_TIME_WINDOW: zod_1.z.string().transform(Number).default("60000"),
    // File Upload
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).default("5242880"),
    ALLOWED_FILE_TYPES: zod_1.z.string().default("image/jpeg,image/png,image/webp"),
    // MinIO/S3 Storage
    MINIO_ENDPOINT: zod_1.z.string().default("localhost"),
    MINIO_PORT: zod_1.z.string().transform(Number).default("9000"),
    MINIO_USE_SSL: zod_1.z
        .string()
        .transform((val) => val === "true")
        .default("false"),
    MINIO_ACCESS_KEY: zod_1.z.string().default("minioadmin"),
    MINIO_SECRET_KEY: zod_1.z.string().default("minioadmin"),
    MINIO_BUCKET_NAME: zod_1.z.string().default("rapchai-uploads"),
    // Sentry
    SENTRY_DSN: zod_1.z.string().optional(),
    SENTRY_ENVIRONMENT: zod_1.z.string().default("development"),
    // WhatsApp Integration
    WHATSAPP_WEBHOOK_URL: zod_1.z.string().optional(),
    WHATSAPP_API_TOKEN: zod_1.z.string().optional(),
    // WebSocket
    WS_CORS_ORIGIN: zod_1.z.string().default("http://localhost:3000"),
    // BullMQ
    QUEUE_REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    // Logging
    LOG_LEVEL: zod_1.z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .default("info"),
    LOG_PRETTY_PRINT: zod_1.z
        .string()
        .transform((val) => val === "true")
        .default("true"),
});
function validateEnv() {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(`Environment validation failed:\n${errorMessages}`);
        }
        throw error;
    }
}
exports.env = validateEnv();
