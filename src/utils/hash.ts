import argon2 from 'argon2';
import { env } from '@/config/env.js';

export class HashService {
  static async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: env.ARGON2_MEMORY_COST,
        timeCost: env.ARGON2_TIME_COST,
        parallelism: env.ARGON2_PARALLELISM,
      });
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      return false;
    }
  }

  static async needsRehash(hash: string): Promise<boolean> {
    try {
      // Check if the hash was created with current parameters
      const options = argon2.getOptions(hash);
      return (
        options.memoryCost !== env.ARGON2_MEMORY_COST ||
        options.timeCost !== env.ARGON2_TIME_COST ||
        options.parallelism !== env.ARGON2_PARALLELISM
      );
    } catch (error) {
      return true; // If we can't parse the options, assume it needs rehashing
    }
  }

  static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  static generateRandomToken(length: number = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    
    for (let i = 0; i < length; i++) {
      token += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return token;
  }
}
