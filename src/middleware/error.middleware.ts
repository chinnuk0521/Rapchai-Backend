import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { loggers } from '@/utils/logger.js';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors: ValidationError[];

  constructor(errors: ValidationError[], message: string = 'Validation failed') {
    super(message, 400);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  loggers.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    ip: request.ip,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Request validation failed',
      statusCode: 400,
      errors: validationErrors,
    });
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.constructor.name.replace('Error', ''),
      message: error.message,
      statusCode: error.statusCode,
      ...(error instanceof ValidationError && { errors: error.errors }),
    });
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A record with this information already exists',
          statusCode: 409,
        });
      
      case 'P2025':
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Record not found',
          statusCode: 404,
        });
      
      case 'P2003':
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Foreign key constraint failed',
          statusCode: 400,
        });
      
      default:
        loggers.error('Unhandled Prisma error:', prismaError);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Database operation failed',
          statusCode: 500,
        });
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid token',
      statusCode: 401,
    });
  }

  if (error.name === 'TokenExpiredError') {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Token expired',
      statusCode: 401,
    });
  }

  // Handle rate limit errors
  if (error.message.includes('rate limit')) {
    return reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      statusCode: 429,
    });
  }

  // Default error response
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : error.message;

  return reply.status(statusCode).send({
    error: 'Internal Server Error',
    message,
    statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
}

// Utility function to create standardized error responses
export function createErrorResponse(
  statusCode: number,
  message: string,
  error?: string
) {
  return {
    error: error || 'Error',
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

// Utility function to handle async route errors
export function asyncHandler(fn: Function) {
  return (request: FastifyRequest, reply: FastifyReply) => {
    Promise.resolve(fn(request, reply)).catch((error) => {
      errorHandler(error, request, reply);
    });
  };
}
