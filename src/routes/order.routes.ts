import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { OrderService } from '@/services/order.service';
import { asyncHandler } from '@/middleware/error.middleware.js';
import { authMiddleware, adminMiddleware } from '@/middleware/auth.middleware.js';

async function orderRoutes(fastify: FastifyInstance) {
  // Create order
  fastify.post('/', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await OrderService.createOrder(request.body as any);
    return reply.status(201).send({ order: result });
  }));

  // Get all orders (admin only)
  fastify.get('/', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const result = await OrderService.getAllOrders(query);
    return reply.send(result);
  }));

  // Get order by ID
  fastify.get('/:id', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await OrderService.getOrderById(id);
    return reply.send({ order: result });
  }));

  // Update order status (admin only)
  fastify.patch('/:id/status', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await OrderService.updateOrderStatus(id, request.body as any);
    return reply.send({ order: result });
  }));

  // Update payment status (admin only)
  fastify.patch('/:id/payment', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await OrderService.updatePaymentStatus(id, request.body as any);
    return reply.send({ order: result });
  }));

  // Cancel order
  fastify.patch('/:id/cancel', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const result = await OrderService.cancelOrder(id);
    return reply.send({ order: result });
  }));

  // Get orders by customer phone (public - for order tracking)
  fastify.get('/customer/:phone', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { phone } = request.params as any;
    const { page, limit } = request.query as any;
    const result = await OrderService.getOrdersByCustomerPhone(phone, page, limit);
    return reply.send(result);
  }));

  // Get today's orders (admin only)
  fastify.get('/today', {
    preHandler: [adminMiddleware],
  }, asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit } = request.query as any;
    const result = await OrderService.getTodaysOrders(page, limit);
    return reply.send(result);
  }));
}

export default orderRoutes;