"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startServer = startServer;
const fastify_1 = __importDefault(require("fastify"));
const env_js_1 = require("./config/env.js");
const index_js_1 = require("./config/index.js");
// import logger from './utils/logger.js';
// Import plugins
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
// Import routes
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const menu_routes_js_1 = __importDefault(require("./routes/menu.routes.js"));
const order_routes_js_1 = __importDefault(require("./routes/order.routes.js"));
const admin_routes_js_1 = __importDefault(require("./routes/admin.routes.js"));
const events_routes_js_1 = __importDefault(require("./routes/events.routes.js"));
const health_routes_js_1 = __importDefault(require("./routes/health.routes.js"));
const test_routes_js_1 = __importDefault(require("./routes/test.routes.js"));
// Import middleware
const error_middleware_js_1 = require("./middleware/error.middleware.js");
async function createApp(options = {}) {
    const app = (0, fastify_1.default)({
        logger: true,
        ...options,
    });
    // Register error handler
    app.setErrorHandler(error_middleware_js_1.errorHandler);
    // Register security plugins
    await app.register(helmet_1.default, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
    });
    await app.register(cors_1.default, {
        origin: env_js_1.env.NODE_ENV === "production"
            ? ["https://rapchai.com", "https://www.rapchai.com"]
            : true,
        credentials: true,
    });
    await app.register(rate_limit_1.default, {
        max: env_js_1.env.RATE_LIMIT_MAX,
        timeWindow: env_js_1.env.RATE_LIMIT_TIME_WINDOW,
        errorResponseBuilder: (_request, context) => ({
            error: "Rate limit exceeded",
            statusCode: 429,
            message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
            retryAfter: Math.round(context.ttl / 1000),
        }),
    });
    // Register multipart for file uploads
    await app.register(multipart_1.default, {
        limits: {
            fileSize: env_js_1.env.MAX_FILE_SIZE,
        },
    });
    // Register Swagger documentation
    await app.register(swagger_1.default, {
        openapi: {
            info: {
                title: "Rapchai Café API",
                description: "Production-ready backend API for Rapchai Café",
                version: "1.0.0",
                contact: {
                    name: "Rapchai Team",
                    email: "contact@rapchai.com",
                },
                license: {
                    name: "MIT",
                    url: "https://opensource.org/licenses/MIT",
                },
            },
            servers: [
                {
                    url: env_js_1.env.NODE_ENV === "production"
                        ? "https://api.rapchai.com"
                        : `http://localhost:${env_js_1.env.PORT}`,
                    description: env_js_1.env.NODE_ENV === "production"
                        ? "Production server"
                        : "Development server",
                },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                },
            },
        },
    });
    await app.register(swagger_ui_1.default, {
        routePrefix: "/docs",
        uiConfig: {
            docExpansion: "list",
            deepLinking: false,
        },
        uiHooks: {
            onRequest: function (_request, _reply, next) {
                next();
            },
            preHandler: function (_request, _reply, next) {
                next();
            },
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
        transformSpecification: (swaggerObject, _request, _reply) => {
            return swaggerObject;
        },
        transformSpecificationClone: true,
    });
    // Register routes
    await app.register(health_routes_js_1.default, { prefix: "/api/health" });
    await app.register(test_routes_js_1.default, { prefix: "/api" });
    await app.register(auth_routes_js_1.default, { prefix: "/api/auth" });
    await app.register(menu_routes_js_1.default, { prefix: "/api/menu" });
    await app.register(order_routes_js_1.default, { prefix: "/api/orders" });
    await app.register(events_routes_js_1.default, { prefix: "/api" });
    await app.register(admin_routes_js_1.default, { prefix: "/api/admin" });
    // Root route
    app.get("/", async (_request, _reply) => {
        return {
            message: "Welcome to Rapchai Café API",
            version: "1.0.0",
            environment: env_js_1.env.NODE_ENV,
            timestamp: new Date().toISOString(),
            docs: "/docs",
        };
    });
    // 404 handler
    app.setNotFoundHandler((request, reply) => {
        reply.status(404).send({
            error: "Not Found",
            message: `Route ${request.method}:${request.url} not found`,
            statusCode: 404,
        });
    });
    return app;
}
async function startServer() {
    try {
        // Connect to external services
        await (0, index_js_1.connectDatabase)();
        // await connectRedis(); // Temporarily disabled
        // Create and start the server
        const app = await createApp();
        await app.listen({
            port: env_js_1.env.PORT,
            host: env_js_1.env.HOST,
        });
        console.log(`🚀 Server running on http://${env_js_1.env.HOST}:${env_js_1.env.PORT}`);
        console.log(`📚 API Documentation: http://${env_js_1.env.HOST}:${env_js_1.env.PORT}/docs`);
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on("SIGTERM", async () => {
    console.info("SIGTERM received, shutting down gracefully");
    process.exit(0);
});
process.on("SIGINT", async () => {
    console.info("SIGINT received, shutting down gracefully");
    process.exit(0);
});
// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
});
