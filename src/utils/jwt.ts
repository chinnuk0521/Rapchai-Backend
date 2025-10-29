import jwt from 'jsonwebtoken';
import { env } from '@/config/env.js';
import { prisma } from '@/config/database.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export class JWTService {
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: 'rapchai-api',
      audience: 'rapchai-client',
    });
  }

  static generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: 'rapchai-api',
      audience: 'rapchai-client',
    });
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET, {
        issuer: 'rapchai-api',
        audience: 'rapchai-client',
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET, {
        issuer: 'rapchai-api',
        audience: 'rapchai-client',
      }) as RefreshTokenPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async createRefreshToken(userId: string): Promise<string> {
    // Generate a simple refresh token with user ID
    const tokenId = Math.random().toString(36).substring(2, 15);
    return this.generateRefreshToken({ userId, tokenId });
  }

  static async revokeRefreshToken(tokenId: string): Promise<void> {
    try {
      // Store revoked token in database
      await prisma.refreshToken.updateMany({
        where: { token: tokenId },
        data: { isRevoked: true },
      });
    } catch (error) {
      // Token might not exist in DB, which is fine
      console.log('Token revocation:', error);
    }
  }

  static async validateRefreshToken(token: string): Promise<{ userId: string; tokenId: string }> {
    const payload = this.verifyRefreshToken(token);
    
    // Check if token is revoked
    const revokedToken = await prisma.refreshToken.findFirst({
      where: { 
        token: payload.tokenId,
        isRevoked: true 
      },
    });

    if (revokedToken) {
      throw new Error('Token has been revoked');
    }

    return { userId: payload.userId, tokenId: payload.tokenId };
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // Revoke all refresh tokens for the user
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    } catch (error) {
      console.log('Revoke all tokens error:', error);
    }
  }

  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  static getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  }
}
