"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const database_js_1 = require("../config/database.js");
const hash_js_1 = require("../utils/hash.js");
const jwt_js_1 = require("../utils/jwt.js");
const redis_js_1 = require("../config/redis.js");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
const logger_js_1 = require("../utils/logger.js");
class AuthService {
    static async register(data) {
        try {
            // Check if user already exists
            const existingUser = await database_js_1.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser) {
                throw new error_middleware_js_1.ConflictError("User with this email already exists");
            }
            // Hash password
            const passwordHash = await hash_js_1.HashService.hashPassword(data.password);
            // Create user
            const user = await database_js_1.prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    passwordHash,
                    role: "CUSTOMER",
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            });
            // Generate tokens
            const accessToken = jwt_js_1.JWTService.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });
            const refreshToken = await jwt_js_1.JWTService.createRefreshToken(user.id);
            logger_js_1.loggers.info("User registered successfully", {
                userId: user.id,
                email: user.email,
            });
            return {
                user,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Registration failed:", error);
            throw error;
        }
    }
    static async login(data) {
        try {
            // Find user
            let user = await database_js_1.prisma.user.findUnique({
                where: { email: data.email },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    passwordHash: true,
                    createdAt: true,
                },
            });
            // Temporary fallback for admin user - create if doesn't exist
            if (data.email === "chandu.kalluru@outlook.com" &&
                data.password === "Kalluru@145") {
                if (!user) {
                    const adminPasswordHash = await hash_js_1.HashService.hashPassword(data.password);
                    user = await database_js_1.prisma.user.create({
                        data: {
                            email: data.email,
                            name: "Chandu Kalluru",
                            role: "ADMIN",
                            passwordHash: adminPasswordHash,
                        },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            passwordHash: true,
                            createdAt: true,
                        },
                    });
                }
            }
            if (!user) {
                throw new error_middleware_js_1.UnauthorizedError("Invalid credentials");
            }
            if (!user.passwordHash) {
                throw new error_middleware_js_1.UnauthorizedError("Account not properly set up");
            }
            // Verify password
            let isValidPassword = false;
            // Temporary fallback for admin user
            if (data.email === "chandu.kalluru@outlook.com" &&
                data.password === "Kalluru@145") {
                isValidPassword = true;
            }
            else {
                isValidPassword = await hash_js_1.HashService.verifyPassword(data.password, user.passwordHash);
            }
            if (!isValidPassword) {
                throw new error_middleware_js_1.UnauthorizedError("Invalid credentials");
            }
            // Check if password needs rehashing
            if (await hash_js_1.HashService.needsRehash(user.passwordHash)) {
                const newPasswordHash = await hash_js_1.HashService.hashPassword(data.password);
                await database_js_1.prisma.user.update({
                    where: { id: user.id },
                    data: { passwordHash: newPasswordHash },
                });
            }
            // Generate tokens
            const accessToken = jwt_js_1.JWTService.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });
            const refreshToken = await jwt_js_1.JWTService.createRefreshToken(user.id);
            // Cache user data
            await redis_js_1.CacheService.set(`user:${user.id}`, {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
            }, 3600); // 1 hour
            logger_js_1.loggers.info("User logged in successfully", {
                userId: user.id,
                email: user.email,
            });
            return {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                },
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Login failed:", error);
            throw error;
        }
    }
    static async refreshToken(data) {
        try {
            const { userId, tokenId } = await jwt_js_1.JWTService.validateRefreshToken(data.refreshToken);
            // Get user data
            const user = await database_js_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            });
            if (!user) {
                throw new error_middleware_js_1.UnauthorizedError("User not found");
            }
            // Generate new access token
            const accessToken = jwt_js_1.JWTService.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });
            // Optionally generate new refresh token (refresh token rotation)
            const newRefreshToken = await jwt_js_1.JWTService.createRefreshToken(user.id);
            logger_js_1.loggers.info("Token refreshed successfully", { userId: user.id });
            return {
                accessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Token refresh failed:", error);
            throw error;
        }
    }
    static async logout(userId, refreshToken) {
        try {
            // Revoke all refresh tokens for the user
            await jwt_js_1.JWTService.revokeAllUserTokens(userId);
            // Clear user cache
            await redis_js_1.CacheService.del(`user:${userId}`);
            logger_js_1.loggers.info("User logged out successfully", { userId });
            return { message: "Logged out successfully" };
        }
        catch (error) {
            logger_js_1.loggers.error("Logout failed:", error);
            throw error;
        }
    }
    static async changePassword(userId, data) {
        try {
            // Get user with password hash
            const user = await database_js_1.prisma.user.findUnique({
                where: { id: userId },
                select: { passwordHash: true },
            });
            if (!user || !user.passwordHash) {
                throw new error_middleware_js_1.NotFoundError("User not found");
            }
            // Verify current password
            const isValidPassword = await hash_js_1.HashService.verifyPassword(data.currentPassword, user.passwordHash);
            if (!isValidPassword) {
                throw new error_middleware_js_1.UnauthorizedError("Current password is incorrect");
            }
            // Hash new password
            const newPasswordHash = await hash_js_1.HashService.hashPassword(data.newPassword);
            // Update password
            await database_js_1.prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash },
            });
            // Revoke all refresh tokens to force re-login
            await jwt_js_1.JWTService.revokeAllUserTokens(userId);
            logger_js_1.loggers.info("Password changed successfully", { userId });
            return { message: "Password changed successfully" };
        }
        catch (error) {
            logger_js_1.loggers.error("Password change failed:", error);
            throw error;
        }
    }
    static async createUser(data) {
        try {
            // Check if user already exists
            const existingUser = await database_js_1.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser) {
                throw new error_middleware_js_1.ConflictError("User with this email already exists");
            }
            // Hash password
            const passwordHash = await hash_js_1.HashService.hashPassword(data.password);
            // Create user
            const user = await database_js_1.prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    passwordHash,
                    role: data.role,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            });
            logger_js_1.loggers.info("User created successfully", {
                userId: user.id,
                email: user.email,
            });
            return user;
        }
        catch (error) {
            logger_js_1.loggers.error("User creation failed:", error);
            throw error;
        }
    }
    static async updateUser(userId, data) {
        try {
            // Check if user exists
            const existingUser = await database_js_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!existingUser) {
                throw new error_middleware_js_1.NotFoundError("User not found");
            }
            // Check email uniqueness if email is being updated
            if (data.email && data.email !== existingUser.email) {
                const emailExists = await database_js_1.prisma.user.findUnique({
                    where: { email: data.email },
                });
                if (emailExists) {
                    throw new error_middleware_js_1.ConflictError("User with this email already exists");
                }
            }
            // Update user
            const user = await database_js_1.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.email && { email: data.email }),
                    ...(data.role && { role: data.role }),
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            // Clear user cache
            await redis_js_1.CacheService.del(`user:${userId}`);
            logger_js_1.loggers.info("User updated successfully", { userId: user.id });
            return user;
        }
        catch (error) {
            logger_js_1.loggers.error("User update failed:", error);
            throw error;
        }
    }
    static async getUserById(userId) {
        try {
            // Try cache first
            const cachedUser = await redis_js_1.CacheService.get(`user:${userId}`);
            if (cachedUser) {
                return cachedUser;
            }
            // Get from database
            const user = await database_js_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!user) {
                throw new error_middleware_js_1.NotFoundError("User not found");
            }
            // Cache user data
            await redis_js_1.CacheService.set(`user:${userId}`, user, 3600);
            return user;
        }
        catch (error) {
            logger_js_1.loggers.error("Get user failed:", error);
            throw error;
        }
    }
    static async getAllUsers(page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const [users, total] = await Promise.all([
                database_js_1.prisma.user.findMany({
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                }),
                database_js_1.prisma.user.count(),
            ]);
            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get all users failed:", error);
            throw error;
        }
    }
}
exports.AuthService = AuthService;
