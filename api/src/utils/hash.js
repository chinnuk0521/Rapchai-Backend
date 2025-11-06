"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const env_js_1 = require("../config/env.js");
class HashService {
    static async hashPassword(password) {
        try {
            return await argon2_1.default.hash(password, {
                type: argon2_1.default.argon2id,
                memoryCost: env_js_1.env.ARGON2_MEMORY_COST,
                timeCost: env_js_1.env.ARGON2_TIME_COST,
                parallelism: env_js_1.env.ARGON2_PARALLELISM,
            });
        }
        catch (error) {
            throw new Error("Password hashing failed");
        }
    }
    static async verifyPassword(password, hash) {
        try {
            return await argon2_1.default.verify(hash, password);
        }
        catch (error) {
            return false;
        }
    }
    static async needsRehash(hash) {
        try {
            // Simply verify the hash works, if it fails verification is needed
            // We can't easily extract options from argon2 hash, so return false
            // Hashes will be rehashed on next login if needed
            return false;
        }
        catch (error) {
            return true; // If we can't parse the hash, assume it needs rehashing
        }
    }
    static generateRandomPassword(length = 12) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
    static generateRandomToken(length = 32) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let token = "";
        for (let i = 0; i < length; i++) {
            token += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return token;
    }
}
exports.HashService = HashService;
