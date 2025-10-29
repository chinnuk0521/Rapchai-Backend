import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTService } from '@/utils/jwt.js';
import { prisma } from '@/config/database.js';
import { loggers } from '@/utils/logger.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        statusCode: 401,
      });
    }

    const token = authHeader.substring(7);
    const payload = JWTService.verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User not found or inactive',
        statusCode: 401,
      });
    }

    // Attach user to request
    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

  } catch (error: any) {
    loggers.error('Authentication error:', error);
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid token',
      statusCode: 401,
    });
  }
}

export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // First run auth middleware
    await authMiddleware(request, reply);
    
    if (reply.statusCode === 401) {
      return; // Auth middleware already sent response
    }

    const user = (request as AuthenticatedRequest).user;
    
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin access required',
        statusCode: 403,
      });
    }

  } catch (error: any) {
    loggers.error('Admin middleware error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authorization check failed',
      statusCode: 500,
    });
  }
}

export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return; // No auth header, continue without user
    }

    const token = authHeader.substring(7);
    const payload = JWTService.verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (user && user.isActive) {
      (request as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }

  } catch (error: any) {
    // Ignore auth errors for optional auth
    loggers.debug('Optional auth failed:', error);
  }
}

export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const user = (request as AuthenticatedRequest).user;
      
      if (!roles.includes(user.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Required roles: ${roles.join(', ')}`,
          statusCode: 403,
        });
      }

    } catch (error: any) {
      loggers.error('Role check error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Role check failed',
        statusCode: 500,
      });
    }
  };
}
