"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
exports.requireRole = requireRole;
const jwt_js_1 = require("../utils/jwt.js");
const database_js_1 = require("../config/database.js");
const logger_js_1 = require("../utils/logger.js");
async function authMiddleware(request, reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.status(401).send({
                error: "Unauthorized",
                message: "Missing or invalid authorization header",
                statusCode: 401,
            });
        }
        const token = authHeader.substring(7);
        const payload = jwt_js_1.JWTService.verifyAccessToken(token);
        // Verify user still exists and is active
        const user = await database_js_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user || !user.isActive) {
            return reply.status(401).send({
                error: "Unauthorized",
                message: "User not found or inactive",
                statusCode: 401,
            });
        }
        // Attach user to request
        request.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
    }
    catch (error) {
        logger_js_1.loggers.error("Authentication error:", error);
        return reply.status(401).send({
            error: "Unauthorized",
            message: "Invalid token",
            statusCode: 401,
        });
    }
}
async function adminMiddleware(request, reply) {
    try {
        // First run auth middleware
        await authMiddleware(request, reply);
        // Check if reply was already sent (status code set means response sent)
        if (reply.statusCode && reply.statusCode === 401) {
            return; // Auth middleware already sent response
        }
        const user = request.user;
        if (user.role !== "ADMIN") {
            return reply.status(403).send({
                error: "Forbidden",
                message: "Admin access required",
                statusCode: 403,
            });
        }
    }
    catch (error) {
        logger_js_1.loggers.error("Admin middleware error:", error);
        return reply.status(500).send({
            error: "Internal Server Error",
            message: "Authorization check failed",
            statusCode: 500,
        });
    }
}
async function optionalAuthMiddleware(request, _reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return; // No auth header, continue without user
        }
        const token = authHeader.substring(7);
        const payload = jwt_js_1.JWTService.verifyAccessToken(token);
        // Verify user still exists and is active
        const user = await database_js_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (user && user.isActive) {
            request.user = {
                id: user.id,
                email: user.email,
                role: user.role,
            };
        }
    }
    catch (error) {
        // Ignore auth errors for optional auth
        logger_js_1.loggers.debug("Optional auth failed:", error);
    }
}
function requireRole(roles) {
    return async (request, reply) => {
        try {
            const user = request.user;
            if (!roles.includes(user.role)) {
                return reply.status(403).send({
                    error: "Forbidden",
                    message: `Required roles: ${roles.join(", ")}`,
                    statusCode: 403,
                });
            }
        }
        catch (error) {
            logger_js_1.loggers.error("Role check error:", error);
            return reply.status(500).send({
                error: "Internal Server Error",
                message: "Role check failed",
                statusCode: 500,
            });
        }
    };
}
