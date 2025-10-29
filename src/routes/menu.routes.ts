import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { MenuService } from '@/services/menu.service';
import { asyncHandler } from '@/middleware/error.middleware.js';
import { adminMiddleware } from '@/middleware/auth.middleware.js';

async function menuRoutes(fastify: FastifyInstance) {
  // Categories
  // Get all categories
  fastify.get('/categories', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit } = request.query as any;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const result = await MenuService.getAllCategories(pageNum, limitNum);
    return reply.send(result);
  }));

  // Get category by ID
  fastify.get('/categories/:id', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await MenuService.getCategoryById(id);
    return reply.send({ category: result });
  }));

  // Create category (admin only)
  fastify.post('/categories', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await MenuService.createCategory(request.body as any);
    return reply.status(201).send({ category: result });
  }));

  // Update category (admin only)
  fastify.put('/categories/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await MenuService.updateCategory(id, request.body as any);
    return reply.send({ category: result });
  }));

  // Delete category (admin only)
  fastify.delete('/categories/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    await MenuService.deleteCategory(id);
    return reply.send({ message: 'Category deleted successfully' });
  }));

  // Menu Items
  // Get all menu items
  fastify.get('/items', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    // Parse numeric parameters
    const parsedQuery = {
      ...query,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 10,
      isVeg: query.isVeg !== undefined ? query.isVeg === 'true' : undefined,
      isAvailable: query.isAvailable !== undefined ? query.isAvailable === 'true' : undefined,
    };
    const result = await MenuService.getAllMenuItems(parsedQuery);
    return reply.send(result);
  }));

  // Get menu item by ID
  fastify.get('/items/:id', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await MenuService.getMenuItemById(id);
    return reply.send({ item: result });
  }));

  // Create menu item (admin only)
  fastify.post('/items', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await MenuService.createMenuItem(request.body as any);
    return reply.status(201).send({ item: result });
  }));

  // Update menu item (admin only)
  fastify.put('/items/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await MenuService.updateMenuItem(id, request.body as any);
    return reply.send({ item: result });
  }));

  // Delete menu item (admin only)
  fastify.delete('/items/:id', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    await MenuService.deleteMenuItem(id);
    return reply.send({ message: 'Menu item deleted successfully' });
  }));

  // Bulk upload menu items (admin only)
  fastify.post('/items/bulk', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { items } = request.body as any;
    const result = await MenuService.bulkCreateMenuItems(items);
    return reply.status(201).send(result);
  }));
}

export default menuRoutes;