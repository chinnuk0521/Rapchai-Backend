"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_service_1 = require("../services/admin.service");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
async function adminRoutes(fastify) {
    // Dashboard analytics
    fastify.get("/dashboard", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const result = await admin_service_1.AdminService.getDashboardAnalytics();
        return reply.send(result);
    }));
    // Events management
    // Get all events (admin only)
    fastify.get("/events", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const { page, limit } = _request.query;
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const result = await admin_service_1.AdminService.getAllEvents(pageNum, limitNum);
        return reply.send(result);
    }));
    // Get event by ID (admin only)
    fastify.get("/events/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await admin_service_1.AdminService.getEventById(id);
        return reply.send({ event: result });
    }));
    // Create event (admin only)
    fastify.post("/events", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await admin_service_1.AdminService.createEvent(request.body);
        return reply.status(201).send({ event: result });
    }));
    // Update event (admin only)
    fastify.put("/events/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await admin_service_1.AdminService.updateEvent(id, request.body);
        return reply.send({ event: result });
    }));
    // Delete event (admin only)
    fastify.delete("/events/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        await admin_service_1.AdminService.deleteEvent(id);
        return reply.send({ message: "Event deleted successfully" });
    }));
    // Bookings management
    // Get all bookings
    fastify.get("/bookings", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const { page, limit } = _request.query;
        const result = await admin_service_1.AdminService.getAllBookings({ page, limit });
        return reply.send(result);
    }));
    // Get booking by ID
    fastify.get("/bookings/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await admin_service_1.AdminService.getBookingById(id);
        return reply.send({ booking: result });
    }));
    // Create booking
    fastify.post("/bookings", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await admin_service_1.AdminService.createBooking(request.body);
        return reply.status(201).send({ booking: result });
    }));
    // Update booking status (admin only)
    fastify.patch("/bookings/:id/status", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await admin_service_1.AdminService.updateBookingStatus(id, request.body);
        return reply.send({ booking: result });
    }));
    // Menu Items management
    // Get all menu items
    fastify.get("/menu-items", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const { page, limit } = _request.query;
        const result = await admin_service_1.AdminService.getAllMenuItems(page, limit);
        return reply.send(result);
    }));
    // Create menu item (admin only)
    fastify.post("/menu-items", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await admin_service_1.AdminService.createMenuItem(request.body);
        return reply.status(201).send({ menuItem: result });
    }));
    // Update menu item (admin only)
    fastify.put("/menu-items/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await admin_service_1.AdminService.updateMenuItem(id, request.body);
        return reply.send({ menuItem: result });
    }));
    // Delete menu item (admin only)
    fastify.delete("/menu-items/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        await admin_service_1.AdminService.deleteMenuItem(id);
        return reply.send({ message: "Menu item deleted successfully" });
    }));
    // Categories management
    // Get all categories
    fastify.get("/categories", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (_request, reply) => {
        const result = await admin_service_1.AdminService.getAllCategories();
        return reply.send({ categories: result });
    }));
    // Create category (admin only)
    fastify.post("/categories", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await admin_service_1.AdminService.createCategory(request.body);
        return reply.status(201).send({ category: result });
    }));
    // Update category (admin only)
    fastify.put("/categories/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await admin_service_1.AdminService.updateCategory(id, request.body);
        return reply.send({ category: result });
    }));
    // Delete category (admin only)
    fastify.delete("/categories/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        await admin_service_1.AdminService.deleteCategory(id);
        return reply.send({ message: "Category deleted successfully" });
    }));
    // Analytics
    // Get sales analytics
    fastify.get("/analytics/sales", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { startDate, endDate } = request.query;
        const result = await admin_service_1.AdminService.getSalesReport(startDate, endDate);
        return reply.send({ analytics: result });
    }));
    // Get customer analytics
    fastify.get("/analytics/customers", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { startDate, endDate } = request.query;
        const result = await admin_service_1.AdminService.getCustomerAnalytics(startDate, endDate);
        return reply.send({ analytics: result });
    }));
}
exports.default = adminRoutes;
