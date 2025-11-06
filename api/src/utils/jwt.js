"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
// @ts-ignore - types are in devDependencies
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const database_js_1 = require("../config/database.js");
class JWTService {
    static generateAccessToken(payload) {
        // @ts-ignore - jsonwebtoken types are problematic
        return jsonwebtoken_1.default.sign(payload, env_js_1.env.JWT_SECRET, {
            expiresIn: env_js_1.env.JWT_EXPIRES_IN,
            issuer: "rapchai-api",
            audience: "rapchai-client",
        });
    }
    static generateRefreshToken(payload) {
        // @ts-ignore - jsonwebtoken types are problematic
        return jsonwebtoken_1.default.sign(payload, env_js_1.env.JWT_REFRESH_SECRET, {
            expiresIn: env_js_1.env.JWT_REFRESH_EXPIRES_IN,
            issuer: "rapchai-api",
            audience: "rapchai-client",
        });
    }
    static verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET, {
                issuer: "rapchai-api",
                audience: "rapchai-client",
            });
        }
        catch (error) {
            throw new Error("Invalid access token");
        }
    }
    static verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_REFRESH_SECRET, {
                issuer: "rapchai-api",
                audience: "rapchai-client",
            });
        }
        catch (error) {
            throw new Error("Invalid refresh token");
        }
    }
    static async createRefreshToken(userId) {
        // Generate a simple refresh token with user ID
        const tokenId = Math.random().toString(36).substring(2, 15);
        return this.generateRefreshToken({ userId, tokenId });
    }
    static async revokeRefreshToken(tokenId) {
        try {
            // Store revoked token in database
            await database_js_1.prisma.refreshToken.updateMany({
                where: { token: tokenId },
                data: { isRevoked: true },
            });
        }
        catch (error) {
            // Token might not exist in DB, which is fine
            console.log("Token revocation:", error);
        }
    }
    static async validateRefreshToken(token) {
        const payload = this.verifyRefreshToken(token);
        // Check if token is revoked
        const revokedToken = await database_js_1.prisma.refreshToken.findFirst({
            where: {
                token: payload.tokenId,
                isRevoked: true,
            },
        });
        if (revokedToken) {
            throw new Error("Token has been revoked");
        }
        return { userId: payload.userId, tokenId: payload.tokenId };
    }
    static async revokeAllUserTokens(userId) {
        try {
            // Revoke all refresh tokens for the user
            await database_js_1.prisma.refreshToken.updateMany({
                where: { userId },
                data: { isRevoked: true },
            });
        }
        catch (error) {
            console.log("Revoke all tokens error:", error);
        }
    }
    static decodeToken(token) {
        return jsonwebtoken_1.default.decode(token);
    }
    static getTokenExpiration(token) {
        const decoded = this.decodeToken(token);
        return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    }
}
exports.JWTService = JWTService;
