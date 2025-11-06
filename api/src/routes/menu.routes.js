"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const menu_service_1 = require("../services/menu.service");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
async function menuRoutes(fastify) {
    // Categories
    // Get all categories
    fastify.get("/categories", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { page, limit } = request.query;
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const result = await menu_service_1.MenuService.getAllCategories(pageNum, limitNum);
        return reply.send(result);
    }));
    // Get category by ID
    fastify.get("/categories/:id", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await menu_service_1.MenuService.getCategoryById(id);
        return reply.send({ category: result });
    }));
    // Create category (admin only)
    fastify.post("/categories", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await menu_service_1.MenuService.createCategory(request.body);
        return reply.status(201).send({ category: result });
    }));
    // Update category (admin only)
    fastify.put("/categories/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await menu_service_1.MenuService.updateCategory(id, request.body);
        return reply.send({ category: result });
    }));
    // Delete category (admin only)
    fastify.delete("/categories/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        await menu_service_1.MenuService.deleteCategory(id);
        return reply.send({ message: "Category deleted successfully" });
    }));
    // Menu Items
    // Get all menu items
    fastify.get("/items", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const query = request.query;
        // Parse numeric parameters
        const parsedQuery = {
            ...query,
            page: query.page ? parseInt(query.page, 10) : 1,
            limit: query.limit ? parseInt(query.limit, 10) : 10,
            isVeg: query.isVeg !== undefined ? query.isVeg === "true" : undefined,
            isAvailable: query.isAvailable !== undefined
                ? query.isAvailable === "true"
                : undefined,
        };
        const result = await menu_service_1.MenuService.getAllMenuItems(parsedQuery);
        return reply.send(result);
    }));
    // Get menu item by ID
    fastify.get("/items/:id", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await menu_service_1.MenuService.getMenuItemById(id);
        return reply.send({ item: result });
    }));
    // Create menu item (admin only)
    fastify.post("/items", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const result = await menu_service_1.MenuService.createMenuItem(request.body);
        return reply.status(201).send({ item: result });
    }));
    // Update menu item (admin only)
    fastify.put("/items/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        const result = await menu_service_1.MenuService.updateMenuItem(id, request.body);
        return reply.send({ item: result });
    }));
    // Delete menu item (admin only)
    fastify.delete("/items/:id", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        await menu_service_1.MenuService.deleteMenuItem(id);
        return reply.send({ message: "Menu item deleted successfully" });
    }));
    // Bulk upload menu items (admin only)
    fastify.post("/items/bulk", {
        preHandler: [auth_middleware_js_1.adminMiddleware],
    }, (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { items } = request.body;
        const result = await menu_service_1.MenuService.bulkCreateMenuItems(items);
        return reply.status(201).send(result);
    }));
}
exports.default = menuRoutes;
