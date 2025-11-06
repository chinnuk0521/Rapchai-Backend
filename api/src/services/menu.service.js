"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const database_js_1 = require("../config/database.js");
const redis_1 = require("../config/redis");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
const logger_js_1 = require("../utils/logger.js");
class MenuService {
    // Categories
    static async getAllCategories(page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const cacheKey = `categories:${page}:${limit}`;
            // Try cache first
            const cached = await redis_1.CacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const [categories, total] = await Promise.all([
                database_js_1.prisma.category.findMany({
                    skip,
                    take: limit,
                    include: {
                        items: {
                            where: { isAvailable: true },
                            select: {
                                id: true,
                                name: true,
                                pricePaise: true,
                                imageUrl: true,
                                isVeg: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                }),
                database_js_1.prisma.category.count(),
            ]);
            const result = {
                categories,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
            // Cache for 5 minutes
            await redis_1.CacheService.set(cacheKey, result, 300);
            return result;
        }
        catch (error) {
            logger_js_1.loggers.error("Get all categories failed:", error);
            throw error;
        }
    }
    static async getCategoryById(id) {
        try {
            const cacheKey = `category:${id}`;
            // Try cache first
            const cached = await redis_1.CacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const category = await database_js_1.prisma.category.findUnique({
                where: { id },
                include: {
                    items: {
                        where: { isAvailable: true },
                        orderBy: { createdAt: "asc" },
                    },
                },
            });
            if (!category) {
                throw new error_middleware_js_1.NotFoundError("Category not found");
            }
            // Cache for 10 minutes
            await redis_1.CacheService.set(cacheKey, category, 600);
            return category;
        }
        catch (error) {
            logger_js_1.loggers.error("Get category by ID failed:", error);
            throw error;
        }
    }
    static async createCategory(data) {
        try {
            // Check if category with same name or slug exists
            const existingCategory = await database_js_1.prisma.category.findFirst({
                where: {
                    OR: [{ name: data.name }, { slug: data.slug }],
                },
            });
            if (existingCategory) {
                throw new error_middleware_js_1.ConflictError("Category with this name or slug already exists");
            }
            const category = await database_js_1.prisma.category.create({
                data: {
                    name: data.name,
                    slug: data.slug,
                    description: data.description || null,
                    imageUrl: data.imageUrl || null,
                    sortOrder: data.sortOrder,
                },
                include: {
                    items: true,
                },
            });
            // Clear categories cache
            await redis_1.CacheService.delPattern("categories:*");
            logger_js_1.loggers.info("Category created successfully", {
                categoryId: category.id,
            });
            return category;
        }
        catch (error) {
            logger_js_1.loggers.error("Create category failed:", error);
            throw error;
        }
    }
    static async updateCategory(id, data) {
        try {
            // Check if category exists
            const existingCategory = await database_js_1.prisma.category.findUnique({
                where: { id },
            });
            if (!existingCategory) {
                throw new error_middleware_js_1.NotFoundError("Category not found");
            }
            // Check for conflicts if updating name or slug
            if (data.name || data.slug) {
                const conflictCategory = await database_js_1.prisma.category.findFirst({
                    where: {
                        AND: [
                            { id: { not: id } },
                            {
                                OR: [
                                    ...(data.name ? [{ name: data.name }] : []),
                                    ...(data.slug ? [{ slug: data.slug }] : []),
                                ],
                            },
                        ],
                    },
                });
                if (conflictCategory) {
                    throw new error_middleware_js_1.ConflictError("Category with this name or slug already exists");
                }
            }
            const category = await database_js_1.prisma.category.update({
                where: { id },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.slug && { slug: data.slug }),
                    ...(data.description !== undefined && {
                        description: data.description,
                    }),
                    ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
                    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
                },
                include: {
                    items: true,
                },
            });
            // Clear cache
            await redis_1.CacheService.del(`category:${id}`);
            await redis_1.CacheService.delPattern("categories:*");
            logger_js_1.loggers.info("Category updated successfully", {
                categoryId: category.id,
            });
            return category;
        }
        catch (error) {
            logger_js_1.loggers.error("Update category failed:", error);
            throw error;
        }
    }
    static async deleteCategory(id) {
        try {
            // Check if category exists
            const category = await database_js_1.prisma.category.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!category) {
                throw new error_middleware_js_1.NotFoundError("Category not found");
            }
            // Check if category has items
            if (category.items.length > 0) {
                throw new error_middleware_js_1.ConflictError("Cannot delete category with existing menu items");
            }
            await database_js_1.prisma.category.delete({
                where: { id },
            });
            // Clear cache
            await redis_1.CacheService.del(`category:${id}`);
            await redis_1.CacheService.delPattern("categories:*");
            logger_js_1.loggers.info("Category deleted successfully", { categoryId: id });
            return { message: "Category deleted successfully" };
        }
        catch (error) {
            logger_js_1.loggers.error("Delete category failed:", error);
            throw error;
        }
    }
    // Bulk create menu items
    static async bulkCreateMenuItems(items) {
        try {
            const results = [];
            const errors = [];
            for (const item of items) {
                try {
                    // Validate required fields
                    if (!item.name || !item.price || !item.category) {
                        errors.push({
                            item,
                            error: "Missing required fields: name, price, or category",
                        });
                        continue;
                    }
                    // Find category by name
                    const category = await database_js_1.prisma.category.findFirst({
                        where: { name: item.category },
                    });
                    if (!category) {
                        errors.push({
                            item,
                            error: `Category "${item.category}" not found`,
                        });
                        continue;
                    }
                    // Create menu item
                    const menuItem = await database_js_1.prisma.menuItem.create({
                        data: {
                            name: item.name,
                            description: item.description || null,
                            pricePaise: Math.round(parseFloat(item.price) * 100), // Convert to paise
                            imageUrl: item.imageUrl || null,
                            isVeg: item.isVeg === "true" || item.isVeg === true,
                            isAvailable: item.isAvailable === "true" || item.isAvailable === true,
                            categoryId: category.id,
                            calories: item.calories ? parseInt(item.calories) : null,
                            prepTime: item.prepTime ? parseInt(item.prepTime) : null,
                        },
                    });
                    results.push(menuItem);
                }
                catch (error) {
                    errors.push({ item, error: error.message });
                }
            }
            // Clear cache
            await redis_1.CacheService.delPattern("menu:*");
            return {
                success: results.length,
                errorCount: errors.length,
                results,
                errors,
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Error in bulk create menu items:", error);
            throw new error_middleware_js_1.AppError("Failed to bulk create menu items", 500);
        }
    }
    // Menu Items
    static async getAllMenuItems(query) {
        try {
            const { page, limit, categoryId, isVeg, isAvailable, search } = query;
            const skip = (page - 1) * limit;
            const where = {};
            if (categoryId) {
                where.categoryId = categoryId;
            }
            if (isVeg !== undefined) {
                where.isVeg = isVeg;
            }
            if (isAvailable !== undefined) {
                where.isAvailable = isAvailable;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ];
            }
            const [items, total] = await Promise.all([
                database_js_1.prisma.menuItem.findMany({
                    skip,
                    take: limit,
                    where,
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }),
                database_js_1.prisma.menuItem.count({ where }),
            ]);
            return {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get all menu items failed:", error);
            throw error;
        }
    }
    static async getMenuItemById(id) {
        try {
            const cacheKey = `menuItem:${id}`;
            // Try cache first
            const cached = await redis_1.CacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const item = await database_js_1.prisma.menuItem.findUnique({
                where: { id },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            });
            if (!item) {
                throw new error_middleware_js_1.NotFoundError("Menu item not found");
            }
            // Cache for 10 minutes
            await redis_1.CacheService.set(cacheKey, item, 600);
            return item;
        }
        catch (error) {
            logger_js_1.loggers.error("Get menu item by ID failed:", error);
            throw error;
        }
    }
    static async createMenuItem(data) {
        try {
            // Verify category exists
            const category = await database_js_1.prisma.category.findUnique({
                where: { id: data.categoryId },
            });
            if (!category) {
                throw new error_middleware_js_1.NotFoundError("Category not found");
            }
            const item = await database_js_1.prisma.menuItem.create({
                data: {
                    name: data.name,
                    description: data.description || null,
                    pricePaise: data.pricePaise,
                    imageUrl: data.imageUrl || null,
                    isVeg: data.isVeg,
                    isAvailable: data.isAvailable,
                    categoryId: data.categoryId,
                    sortOrder: data.sortOrder,
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            });
            // Clear cache
            await redis_1.CacheService.delPattern("menuItems:*");
            await redis_1.CacheService.del(`category:${data.categoryId}`);
            logger_js_1.loggers.info("Menu item created successfully", { itemId: item.id });
            return item;
        }
        catch (error) {
            logger_js_1.loggers.error("Create menu item failed:", error);
            throw error;
        }
    }
    static async updateMenuItem(id, data) {
        try {
            // Check if item exists
            const existingItem = await database_js_1.prisma.menuItem.findUnique({
                where: { id },
            });
            if (!existingItem) {
                throw new error_middleware_js_1.NotFoundError("Menu item not found");
            }
            // Verify category if updating
            if (data.categoryId) {
                const category = await database_js_1.prisma.category.findUnique({
                    where: { id: data.categoryId },
                });
                if (!category) {
                    throw new error_middleware_js_1.NotFoundError("Category not found");
                }
            }
            const item = await database_js_1.prisma.menuItem.update({
                where: { id },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.description !== undefined && {
                        description: data.description,
                    }),
                    ...(data.pricePaise !== undefined && { pricePaise: data.pricePaise }),
                    ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
                    ...(data.isVeg !== undefined && { isVeg: data.isVeg }),
                    ...(data.isAvailable !== undefined && {
                        isAvailable: data.isAvailable,
                    }),
                    ...(data.categoryId && { categoryId: data.categoryId }),
                    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            });
            // Clear cache
            await redis_1.CacheService.del(`menuItem:${id}`);
            await redis_1.CacheService.delPattern("menuItems:*");
            await redis_1.CacheService.del(`category:${item.categoryId}`);
            logger_js_1.loggers.info("Menu item updated successfully", { itemId: item.id });
            return item;
        }
        catch (error) {
            logger_js_1.loggers.error("Update menu item failed:", error);
            throw error;
        }
    }
    static async deleteMenuItem(id) {
        try {
            // Check if item exists
            const item = await database_js_1.prisma.menuItem.findUnique({
                where: { id },
            });
            if (!item) {
                throw new error_middleware_js_1.NotFoundError("Menu item not found");
            }
            await database_js_1.prisma.menuItem.delete({
                where: { id },
            });
            // Clear cache
            await redis_1.CacheService.del(`menuItem:${id}`);
            await redis_1.CacheService.delPattern("menuItems:*");
            await redis_1.CacheService.del(`category:${item.categoryId}`);
            logger_js_1.loggers.info("Menu item deleted successfully", { itemId: id });
            return { message: "Menu item deleted successfully" };
        }
        catch (error) {
            logger_js_1.loggers.error("Delete menu item failed:", error);
            throw error;
        }
    }
    static async toggleItemAvailability(id) {
        try {
            const item = await database_js_1.prisma.menuItem.findUnique({
                where: { id },
            });
            if (!item) {
                throw new error_middleware_js_1.NotFoundError("Menu item not found");
            }
            const updatedItem = await database_js_1.prisma.menuItem.update({
                where: { id },
                data: { isAvailable: !item.isAvailable },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            });
            // Clear cache
            await redis_1.CacheService.del(`menuItem:${id}`);
            await redis_1.CacheService.delPattern("menuItems:*");
            await redis_1.CacheService.del(`category:${item.categoryId}`);
            logger_js_1.loggers.info("Menu item availability toggled", {
                itemId: id,
                isAvailable: updatedItem.isAvailable,
            });
            return updatedItem;
        }
        catch (error) {
            logger_js_1.loggers.error("Toggle item availability failed:", error);
            throw error;
        }
    }
    static async getMenuItemsByCategory(categoryId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const [items, total] = await Promise.all([
                database_js_1.prisma.menuItem.findMany({
                    skip,
                    take: limit,
                    where: {
                        categoryId,
                        isAvailable: true,
                    },
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                    },
                    orderBy: { sortOrder: "asc" },
                }),
                database_js_1.prisma.menuItem.count({
                    where: {
                        categoryId,
                        isAvailable: true,
                    },
                }),
            ]);
            return {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get menu items by category failed:", error);
            throw error;
        }
    }
    static async searchMenuItems(query) {
        try {
            const { q, categoryId, isVeg, isAvailable, page = 1, limit = 10 } = query;
            const skip = (page - 1) * limit;
            const where = {};
            if (q) {
                where.OR = [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                ];
            }
            if (categoryId) {
                where.categoryId = categoryId;
            }
            if (isVeg !== undefined) {
                where.isVeg = isVeg;
            }
            if (isAvailable !== undefined) {
                where.isAvailable = isAvailable;
            }
            const [items, total] = await Promise.all([
                database_js_1.prisma.menuItem.findMany({
                    skip,
                    take: limit,
                    where,
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }),
                database_js_1.prisma.menuItem.count({ where }),
            ]);
            return {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Search menu items failed:", error);
            throw error;
        }
    }
}
exports.MenuService = MenuService;
