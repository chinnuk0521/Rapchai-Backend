"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.createErrorResponse = createErrorResponse;
exports.asyncHandler = asyncHandler;
const zod_1 = require("zod");
const logger_js_1 = require("../utils/logger.js");
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    errors;
    constructor(errors, message = "Validation failed") {
        super(message, 400);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(message, 409);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = "Rate limit exceeded") {
        super(message, 429);
    }
}
exports.RateLimitError = RateLimitError;
function errorHandler(error, request, reply) {
    logger_js_1.loggers.error("Error occurred:", {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        ip: request.ip,
    });
    // Handle Zod validation errors
    if (error instanceof zod_1.ZodError) {
        const validationErrors = error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
        }));
        return reply.status(400).send({
            error: "Validation Error",
            message: "Request validation failed",
            statusCode: 400,
            errors: validationErrors,
        });
    }
    // Handle custom app errors
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            error: error.constructor.name.replace("Error", ""),
            message: error.message,
            statusCode: error.statusCode,
            ...(error instanceof ValidationError && { errors: error.errors }),
        });
    }
    // Handle Prisma errors
    if (error.name === "PrismaClientKnownRequestError") {
        const prismaError = error;
        switch (prismaError.code) {
            case "P2002":
                return reply.status(409).send({
                    error: "Conflict",
                    message: "A record with this information already exists",
                    statusCode: 409,
                });
            case "P2025":
                return reply.status(404).send({
                    error: "Not Found",
                    message: "Record not found",
                    statusCode: 404,
                });
            case "P2003":
                return reply.status(400).send({
                    error: "Bad Request",
                    message: "Foreign key constraint failed",
                    statusCode: 400,
                });
            default:
                logger_js_1.loggers.error("Unhandled Prisma error:", prismaError);
                return reply.status(500).send({
                    error: "Internal Server Error",
                    message: "Database operation failed",
                    statusCode: 500,
                });
        }
    }
    // Handle JWT errors
    if (error.name === "JsonWebTokenError") {
        return reply.status(401).send({
            error: "Unauthorized",
            message: "Invalid token",
            statusCode: 401,
        });
    }
    if (error.name === "TokenExpiredError") {
        return reply.status(401).send({
            error: "Unauthorized",
            message: "Token expired",
            statusCode: 401,
        });
    }
    // Handle rate limit errors
    if (error.message.includes("rate limit")) {
        return reply.status(429).send({
            error: "Too Many Requests",
            message: "Rate limit exceeded",
            statusCode: 429,
        });
    }
    // Default error response
    const statusCode = 500;
    const nodeEnv = process.env["NODE_ENV"];
    const message = nodeEnv === "production" ? "Internal Server Error" : error.message;
    return reply.status(statusCode).send({
        error: "Internal Server Error",
        message,
        statusCode,
        ...(nodeEnv !== "production" && { stack: error.stack }),
    });
}
// Utility function to create standardized error responses
function createErrorResponse(statusCode, message, error) {
    return {
        error: error || "Error",
        message,
        statusCode,
        timestamp: new Date().toISOString(),
    };
}
// Utility function to handle async route errors
function asyncHandler(fn) {
    return (request, reply) => {
        Promise.resolve(fn(request, reply)).catch((error) => {
            errorHandler(error, request, reply);
        });
    };
}
