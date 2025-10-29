import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { asyncHandler } from '@/middleware/error.middleware.js';

async function testRoutes(fastify: FastifyInstance) {
  // Test endpoint to verify backend is working
  fastify.get('/test', {
    schema: {
      description: 'Test endpoint to verify backend is working',
      tags: ['Test'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            timestamp: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Rapchai Backend API is working!',
      timestamp: new Date().toISOString(),
      status: 'success',
    });
  }));

  // Test database connection
  fastify.get('/test/db', {
    schema: {
      description: 'Test database connection',
      tags: ['Test'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            database: { type: 'string' },
          },
        },
      },
    },
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { prisma } = await import('@/config/database.js');
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({
        message: 'Database connection successful',
        database: 'connected',
      });
    } catch (error) {
      return reply.status(500).send({
        message: 'Database connection failed',
        database: 'disconnected',
        error: error.message,
      });
    }
  }));

  // Test Redis connection
  fastify.get('/test/redis', {
    schema: {
      description: 'Test Redis connection',
      tags: ['Test'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            redis: { type: 'string' },
          },
        },
      },
    },
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { redis } = await import('@/config/redis.js');
    
    try {
      await redis.ping();
      return reply.send({
        message: 'Redis connection successful',
        redis: 'connected',
      });
    } catch (error) {
      return reply.status(500).send({
        message: 'Redis connection failed',
        redis: 'disconnected',
        error: error.message,
      });
    }
  }));
}

export default testRoutes;
