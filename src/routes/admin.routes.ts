import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AdminService } from '@/services/admin.service';
import { asyncHandler } from '@/middleware/error.middleware.js';
import { adminMiddleware } from '@/middleware/auth.middleware.js';

async function adminRoutes(fastify: FastifyInstance) {
  // Dashboard analytics
  fastify.get('/dashboard', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await AdminService.getDashboardAnalytics();
    return reply.send(result);
  }));

  // Events management
  // Get all events (admin only)
  fastify.get('/events', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit } = _request.query as any;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const result = await AdminService.getAllEvents(pageNum, limitNum);
    return reply.send(result);
  }));

  // Get event by ID (admin only)
  fastify.get('/events/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AdminService.getEventById(id);
    return reply.send({ event: result });
  }));

  // Create event (admin only)
  fastify.post('/events', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AdminService.createEvent(request.body as any);
    return reply.status(201).send({ event: result });
  }));

  // Update event (admin only)
  fastify.put('/events/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AdminService.updateEvent(id, request.body as any);
    return reply.send({ event: result });
  }));

  // Delete event (admin only)
  fastify.delete('/events/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    await AdminService.deleteEvent(id);
    return reply.send({ message: 'Event deleted successfully' });
  }));

  // Bookings management
  // Get all bookings
  fastify.get('/bookings', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
    const query = _request.query as any;
    const result = await AdminService.getAllBookings(query);
    return reply.send(result);
  }));

  // Get booking by ID
  fastify.get('/bookings/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AdminService.getBookingById(id);
    return reply.send({ booking: result });
  }));

  // Create booking
  fastify.post('/bookings', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AdminService.createBooking(request.body as any);
    return reply.status(201).send({ booking: result });
  }));

  // Update booking status (admin only)
  fastify.patch('/bookings/:id/status', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AdminService.updateBookingStatus(id, request.body as any);
    return reply.send({ booking: result });
  }));

  // Menu Items management
  // Get all menu items
  fastify.get('/menu-items', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit } = _request.query as any;
    const result = await AdminService.getAllMenuItems(page, limit);
    return reply.send(result);
  }));

  // Create menu item (admin only)
  fastify.post('/menu-items', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AdminService.createMenuItem(request.body as any);
    return reply.status(201).send({ menuItem: result });
  }));

  // Update menu item (admin only)
  fastify.put('/menu-items/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AdminService.updateMenuItem(id, request.body as any);
    return reply.send({ menuItem: result });
  }));

  // Delete menu item (admin only)
  fastify.delete('/menu-items/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    await AdminService.deleteMenuItem(id);
    return reply.send({ message: 'Menu item deleted successfully' });
  }));

  // Categories management
  // Get all categories
  fastify.get('/categories', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await AdminService.getAllCategories();
    return reply.send({ categories: result });
  }));

  // Create category (admin only)
  fastify.post('/categories', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await AdminService.createCategory(request.body as any);
    return reply.status(201).send({ category: result });
  }));

  // Update category (admin only)
  fastify.put('/categories/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await AdminService.updateCategory(id, request.body as any);
    return reply.send({ category: result });
  }));

  // Delete category (admin only)
  fastify.delete('/categories/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    await AdminService.deleteCategory(id);
    return reply.send({ message: 'Category deleted successfully' });
  }));

  // Analytics
  // Get sales analytics
  fastify.get('/analytics/sales', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { startDate, endDate } = request.query as any;
    const result = await AdminService.getSalesReport(startDate, endDate);
    return reply.send({ analytics: result });
  }));

  // Get customer analytics
  fastify.get('/analytics/customers', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { startDate, endDate } = request.query as any;
    const result = await AdminService.getCustomerAnalytics(startDate, endDate);
    return reply.send({ analytics: result });
  }));
}

export default adminRoutes;