import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AuthService } from '@/services/auth.service';
import { asyncHandler } from '@/middleware/error.middleware.js';
import { authMiddleware, adminMiddleware } from '@/middleware/auth.middleware.js';

async function authRoutes(fastify: FastifyInstance) {
  // Register user
  fastify.post('/register', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AuthService.register(request.body as any);
    return reply.status(201).send(result);
  }));

  // Login user
  fastify.post('/login', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AuthService.login(request.body as any);
    return reply.send(result);
  }));

  // Refresh token
  fastify.post('/refresh', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AuthService.refreshToken(request.body as any);
    return reply.send(result);
  }));

  // Logout user
  fastify.post('/logout', {
    preHandler: [authMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const result = await AuthService.logout(user.id);
    return reply.send(result);
  }));

  // Change password
  fastify.post('/change-password', {
    preHandler: [authMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const result = await AuthService.changePassword(user.id, request.body as any);
    return reply.send(result);
  }));

  // Get current user profile
  fastify.get('/me', {
    preHandler: [authMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const result = await AuthService.getUserById(user.id);
    return reply.send({ user: result });
  }));

  // Admin routes
  // Create user (admin only)
  fastify.post('/admin/users', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AuthService.createUser(request.body as any);
    return reply.status(201).send({ user: result });
  }));

  // Get all users (admin only)
  fastify.get('/admin/users', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit } = request.query as any;
    const result = await AuthService.getAllUsers(page, limit);
    return reply.send(result);
  }));

  // Get user by ID (admin only)
  fastify.get('/admin/users/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AuthService.getUserById(id);
    return reply.send({ user: result });
  }));

  // Update user (admin only)
  fastify.put('/admin/users/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AuthService.updateUser(id, request.body as any);
    return reply.send({ user: result });
  }));
}

export default authRoutes;