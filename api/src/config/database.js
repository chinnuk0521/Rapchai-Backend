"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.healthCheckDatabase = healthCheckDatabase;
const client_1 = require("../generated/prisma/client");
const env_js_1 = require("./env.js");
exports.prisma = globalThis.__prisma ||
    new client_1.PrismaClient({
        log: env_js_1.env["NODE_ENV"] === "development"
            ? ["query", "error", "warn"]
            : ["error"],
        datasources: {
            db: {
                url: env_js_1.env.DATABASE_URL,
            },
        },
        // For Supabase and serverless environments, use connection pooling
        // If DATABASE_URL contains 'pooler' or 'supabase', it's already configured
        // Otherwise, ensure proper connection handling for serverless
    });
if (env_js_1.env["NODE_ENV"] !== "production") {
    globalThis.__prisma = exports.prisma;
}
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        console.log("✅ Database connected successfully");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error;
    }
}
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        console.log("✅ Database disconnected successfully");
    }
    catch (error) {
        console.error("❌ Database disconnection failed:", error);
        throw error;
    }
}
async function healthCheckDatabase() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error("❌ Database health check failed:", error);
        return false;
    }
}
