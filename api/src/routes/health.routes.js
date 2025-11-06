"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../config/index.js");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
// import logger from '../utils/logger.js';
async function healthRoutes(fastify) {
    // Basic health check
    fastify.get("/", {
        schema: {
            description: "Basic health check",
            tags: ["Health"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        timestamp: { type: "string" },
                        uptime: { type: "number" },
                        environment: { type: "string" },
                        version: { type: "string" },
                    },
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        return reply.send({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env["NODE_ENV"] || "development",
            version: "1.0.0",
        });
    }));
    // Detailed health check
    fastify.get("/detailed", {
        schema: {
            description: "Detailed health check with service status",
            tags: ["Health"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        timestamp: { type: "string" },
                        uptime: { type: "number" },
                        environment: { type: "string" },
                        version: { type: "string" },
                        services: {
                            type: "object",
                            properties: {
                                database: { type: "object" },
                                redis: { type: "object" },
                            },
                        },
                        system: {
                            type: "object",
                            properties: {
                                memory: { type: "object" },
                                cpu: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const startTime = Date.now();
        // Check services
        const [dbHealthy, redisHealthy] = await Promise.all([
            (0, index_js_1.healthCheckDatabase)(),
            (0, index_js_1.healthCheckRedis)(),
        ]);
        const responseTime = Date.now() - startTime;
        const overallStatus = dbHealthy && redisHealthy ? "healthy" : "unhealthy";
        // System metrics
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return reply.send({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env["NODE_ENV"] || "development",
            version: "1.0.0",
            responseTime,
            services: {
                database: {
                    status: dbHealthy ? "healthy" : "unhealthy",
                    responseTime: responseTime,
                },
                redis: {
                    status: redisHealthy ? "healthy" : "unhealthy",
                    responseTime: responseTime,
                },
            },
            system: {
                memory: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external,
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system,
                },
            },
        });
    }));
    // Readiness check
    fastify.get("/ready", {
        schema: {
            description: "Readiness check for Kubernetes",
            tags: ["Health"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        timestamp: { type: "string" },
                    },
                },
                503: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        timestamp: { type: "string" },
                        errors: { type: "array" },
                    },
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const errors = [];
        // Check database
        const dbHealthy = await (0, index_js_1.healthCheckDatabase)();
        if (!dbHealthy) {
            errors.push("Database connection failed");
        }
        // Check Redis
        const redisHealthy = await (0, index_js_1.healthCheckRedis)();
        if (!redisHealthy) {
            errors.push("Redis connection failed");
        }
        if (errors.length > 0) {
            return reply.status(503).send({
                status: "not ready",
                timestamp: new Date().toISOString(),
                errors,
            });
        }
        return reply.send({
            status: "ready",
            timestamp: new Date().toISOString(),
        });
    }));
    // Liveness check
    fastify.get("/live", {
        schema: {
            description: "Liveness check for Kubernetes",
            tags: ["Health"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        timestamp: { type: "string" },
                        uptime: { type: "number" },
                    },
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        return reply.send({
            status: "alive",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    }));
    // Metrics endpoint (Prometheus format)
    fastify.get("/metrics", {
        schema: {
            description: "Prometheus metrics endpoint",
            tags: ["Health"],
            response: {
                200: {
                    type: "string",
                },
            },
        },
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const metrics = `
# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}
nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}

# HELP nodejs_cpu_usage_seconds CPU usage in seconds
# TYPE nodejs_cpu_usage_seconds counter
nodejs_cpu_usage_seconds{type="user"} ${cpuUsage.user / 1000000}
nodejs_cpu_usage_seconds{type="system"} ${cpuUsage.system / 1000000}

# HELP nodejs_uptime_seconds Uptime in seconds
# TYPE nodejs_uptime_seconds gauge
nodejs_uptime_seconds ${process.uptime()}

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1
`.trim();
        return reply
            .type("text/plain; version=0.0.4; charset=utf-8")
            .send(metrics);
    }));
}
exports.default = healthRoutes;
