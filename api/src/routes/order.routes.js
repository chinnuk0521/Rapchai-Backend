"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_service_1 = require("../services/order.service");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
async function orderRoutes(fastify) {
    // Create order
    fastify.post("/", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await order_service_1.OrderService.createOrder(request.body);
        return reply.status(201).send({ order: result });
    }));
    // Get all orders (admin only)
    fastify.get("/", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const query = request.query;
        const result = await order_service_1.OrderService.getAllOrders(query);
        return reply.send(result);
    }));
    // Get order by ID
    fastify.get("/:id", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await order_service_1.OrderService.getOrderById(id);
        return reply.send({ order: result });
    }));
    // Update order status (admin only)
    fastify.patch("/:id/status", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await order_service_1.OrderService.updateOrderStatus(id, request.body);
        return reply.send({ order: result });
    }));
    // Update payment status (admin only)
    fastify.patch("/:id/payment", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await order_service_1.OrderService.updatePaymentStatus(id, request.body);
        return reply.send({ order: result });
    }));
    // Cancel order
    fastify.patch("/:id/cancel", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await order_service_1.OrderService.cancelOrder(id);
        return reply.send({ order: result });
    }));
    // Get orders by customer phone (public - for order tracking)
    fastify.get("/customer/:phone", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { phone } = request.params;
        const { page, limit } = request.query;
        const result = await order_service_1.OrderService.getOrdersByCustomerPhone(phone, page, limit);
        return reply.send(result);
    }));
    // Get today's orders (admin only)
    fastify.get("/today", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { page, limit } = request.query;
        const result = await order_service_1.OrderService.getTodaysOrders(page, limit);
        return reply.send(result);
    }));
}
exports.default = orderRoutes;
