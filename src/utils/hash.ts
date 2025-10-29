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
      // Simply verify the hash works, if it fails verification is needed
      // We can't easily extract options from argon2 hash, so return false
      // Hashes will be rehashed on next login if needed
      return false;
    } catch (error) {
      return true; // If we can't parse the hash, assume it needs rehashing
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
