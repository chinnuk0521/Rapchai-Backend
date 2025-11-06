"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const error_middleware_js_1 = require("../middleware/error.middleware.js");
async function testRoutes(fastify) {
    // Test endpoint to verify backend is working
    fastify.get("/test", {
        schema: {
            description: "Test endpoint to verify backend is working",
            tags: ["Test"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        timestamp: { type: "string" },
                        status: { type: "string" },
                    },
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        return reply.send({
            message: "Rapchai Backend API is working!",
            timestamp: new Date().toISOString(),
            status: "success",
        });
    }));
    // Test database connection
    fastify.get("/test/db", {
        schema: {
            description: "Test database connection",
            tags: ["Test"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        database: { type: "string" },
                    },
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("@/config/database.js")));
        try {
            await prisma.$queryRaw `SELECT 1`;
            return reply.send({
                message: "Database connection successful",
                database: "connected",
            });
        }
        catch (error) {
            return reply.status(500).send({
                message: "Database connection failed",
                database: "disconnected",
                error: error?.message || String(error),
            });
        }
    }));
    // Test Redis connection
    fastify.get("/test/redis", {
        schema: {
            description: "Test Redis connection",
            tags: ["Test"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        redis: { type: "string" },
                    },
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { redis } = await Promise.resolve().then(() => __importStar(require("@/config/redis.js")));
        try {
            await redis.ping();
            return reply.send({
                message: "Redis connection successful",
                redis: "connected",
            });
        }
        catch (error) {
            return reply.status(500).send({
                message: "Redis connection failed",
                redis: "disconnected",
                error: error?.message || String(error),
            });
        }
    }));
}
exports.default = testRoutes;
