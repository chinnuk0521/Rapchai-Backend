"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../services/auth.service");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
async function authRoutes(fastify) {
    // Register user
    fastify.post("/register", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await auth_service_1.AuthService.register(request.body);
        return reply.status(201).send(result);
    }));
    // Login user
    fastify.post("/login", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await auth_service_1.AuthService.login(request.body);
        return reply.send(result);
    }));
    // Refresh token
    fastify.post("/refresh", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await auth_service_1.AuthService.refreshToken(request.body);
        return reply.send(result);
    }));
    // Logout user
    fastify.post("/logout", {
        preHandler: [auth_middleware_js_1.authMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const user = request.user;
        const result = await auth_service_1.AuthService.logout(user.id);
        return reply.send(result);
    }));
    // Change password
    fastify.post("/change-password", {
        preHandler: [auth_middleware_js_1.authMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const user = request.user;
        const result = await auth_service_1.AuthService.changePassword(user.id, request.body);
        return reply.send(result);
    }));
    // Get current user profile
    fastify.get("/me", {
        preHandler: [auth_middleware_js_1.authMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const user = request.user;
        const result = await auth_service_1.AuthService.getUserById(user.id);
        return reply.send({ user: result });
    }));
    // Admin routes
    // Create user (admin only)
    fastify.post("/admin/users", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await auth_service_1.AuthService.createUser(request.body);
        return reply.status(201).send({ user: result });
    }));
    // Get all users (admin only)
    fastify.get("/admin/users", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { page, limit } = request.query;
        const result = await auth_service_1.AuthService.getAllUsers(page, limit);
        return reply.send(result);
    }));
    // Get user by ID (admin only)
    fastify.get("/admin/users/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await auth_service_1.AuthService.getUserById(id);
        return reply.send({ user: result });
    }));
    // Update user (admin only)
    fastify.put("/admin/users/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await auth_service_1.AuthService.updateUser(id, request.body);
        return reply.send({ user: result });
    }));
}
exports.default = authRoutes;
