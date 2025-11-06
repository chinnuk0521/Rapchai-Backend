"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const database_js_1 = require("../config/database.js");
const redis_1 = require("../config/redis");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
const logger_js_1 = require("../utils/logger.js");
class OrderService {
    static async createOrder(data) {
        try {
            // Validate menu items exist and are available
            const menuItemIds = data.items.map((item) => item.menuItemId);
            const menuItems = await database_js_1.prisma.menuItem.findMany({
                where: {
                    id: { in: menuItemIds },
                    isAvailable: true,
                },
                select: {
                    id: true,
                    name: true,
                    pricePaise: true,
                    isAvailable: true,
                },
            });
            if (menuItems.length !== menuItemIds.length) {
                throw new error_middleware_js_1.NotFoundError("One or more menu items not found or unavailable");
            }
            // Calculate total
            let totalPaise = 0;
            const orderItems = data.items.map((item) => {
                const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
                if (!menuItem) {
                    throw new error_middleware_js_1.NotFoundError(`Menu item ${item.menuItemId} not found`);
                }
                const itemTotal = menuItem.pricePaise * item.quantity;
                totalPaise += itemTotal;
                return {
                    menuItem: { connect: { id: item.menuItemId } },
                    quantity: item.quantity,
                    unitPaise: menuItem.pricePaise,
                    notes: item.notes || null,
                };
            });
            // Generate unique order number
            const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            // Create order with items
            const order = await database_js_1.prisma.order.create({
                data: {
                    orderNumber,
                    customerName: data.customerName,
                    customerPhone: data.customerPhone,
                    customerEmail: data.customerEmail,
                    tableNumber: data.tableNumber,
                    orderType: data.orderType
                        .toUpperCase()
                        .replace(/-/g, "_"),
                    notes: data.notes,
                    specialInstructions: data.specialInstructions,
                    totalPaise,
                    status: "PENDING",
                    items: {
                        create: orderItems,
                    },
                },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    pricePaise: true,
                                    imageUrl: true,
                                    isVeg: true,
                                },
                            },
                        },
                    },
                },
            });
            // Clear cache
            await redis_1.CacheService.delPattern("orders:*");
            logger_js_1.loggers.info("Order created successfully", {
                orderId: order.id,
                totalPaise: order.totalPaise,
            });
            return order;
        }
        catch (error) {
            logger_js_1.loggers.error("Create order failed:", error);
            throw error;
        }
    }
    static async getAllOrders(query) {
        try {
            const { page = 1, limit = 10, status, orderType, paymentStatus, startDate, endDate, } = query;
            const skip = (page - 1) * limit;
            const where = {};
            if (status) {
                where.status = status;
            }
            if (orderType) {
                where.orderType = orderType;
            }
            if (paymentStatus) {
                where.paymentStatus = paymentStatus;
            }
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    where.createdAt.lte = new Date(endDate);
                }
            }
            const [orders, total] = await Promise.all([
                database_js_1.prisma.order.findMany({
                    skip,
                    take: limit,
                    where,
                    include: {
                        items: {
                            include: {
                                menuItem: {
                                    select: {
                                        id: true,
                                        name: true,
                                        pricePaise: true,
                                        imageUrl: true,
                                        isVeg: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }),
                database_js_1.prisma.order.count({ where }),
            ]);
            return {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get all orders failed:", error);
            throw error;
        }
    }
    static async getOrderById(id) {
        try {
            const cacheKey = `order:${id}`;
            // Try cache first
            const cached = await redis_1.CacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const order = await database_js_1.prisma.order.findUnique({
                where: { id },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    pricePaise: true,
                                    imageUrl: true,
                                    isVeg: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!order) {
                throw new error_middleware_js_1.NotFoundError("Order not found");
            }
            // Cache for 5 minutes
            await redis_1.CacheService.set(cacheKey, order, 300);
            return order;
        }
        catch (error) {
            logger_js_1.loggers.error("Get order by ID failed:", error);
            throw error;
        }
    }
    static async getOrdersByCustomerPhone(phone, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const [orders, total] = await Promise.all([
                database_js_1.prisma.order.findMany({
                    skip,
                    take: limit,
                    where: { customerPhone: phone },
                    include: {
                        items: {
                            include: {
                                menuItem: {
                                    select: {
                                        id: true,
                                        name: true,
                                        pricePaise: true,
                                        imageUrl: true,
                                        isVeg: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }),
                database_js_1.prisma.order.count({ where: { customerPhone: phone } }),
            ]);
            return {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get orders by customer phone failed:", error);
            throw error;
        }
    }
    static async updateOrderStatus(id, status) {
        try {
            const order = await database_js_1.prisma.order.findUnique({
                where: { id },
            });
            if (!order) {
                throw new error_middleware_js_1.NotFoundError("Order not found");
            }
            // Validate status transition
            const validTransitions = {
                PENDING: ["CONFIRMED", "CANCELLED"],
                CONFIRMED: ["PREPARING", "CANCELLED"],
                PREPARING: ["READY", "CANCELLED"],
                READY: ["COMPLETED"],
                COMPLETED: [],
                CANCELLED: [],
            };
            if (!validTransitions[order.status]?.includes(status)) {
                throw new error_middleware_js_1.ConflictError(`Cannot change status from ${order.status} to ${status}`);
            }
            const updatedOrder = await database_js_1.prisma.order.update({
                where: { id },
                data: { status: status },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    pricePaise: true,
                                    imageUrl: true,
                                    isVeg: true,
                                },
                            },
                        },
                    },
                },
            });
            // Clear cache
            await redis_1.CacheService.del(`order:${id}`);
            await redis_1.CacheService.delPattern("orders:*");
            logger_js_1.loggers.info("Order status updated", {
                orderId: id,
                oldStatus: order.status,
                newStatus: status,
            });
            return updatedOrder;
        }
        catch (error) {
            logger_js_1.loggers.error("Update order status failed:", error);
            throw error;
        }
    }
    static async updatePaymentStatus(id, paymentStatus) {
        try {
            const order = await database_js_1.prisma.order.findUnique({
                where: { id },
            });
            if (!order) {
                throw new error_middleware_js_1.NotFoundError("Order not found");
            }
            const updatedOrder = await database_js_1.prisma.order.update({
                where: { id },
                data: { paymentStatus: paymentStatus },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    pricePaise: true,
                                    imageUrl: true,
                                    isVeg: true,
                                },
                            },
                        },
                    },
                },
            });
            // Clear cache
            await redis_1.CacheService.del(`order:${id}`);
            await redis_1.CacheService.delPattern("orders:*");
            logger_js_1.loggers.info("Payment status updated", {
                orderId: id,
                paymentStatus,
            });
            return updatedOrder;
        }
        catch (error) {
            logger_js_1.loggers.error("Update payment status failed:", error);
            throw error;
        }
    }
    static async cancelOrder(id, reason) {
        try {
            const order = await database_js_1.prisma.order.findUnique({
                where: { id },
            });
            if (!order) {
                throw new error_middleware_js_1.NotFoundError("Order not found");
            }
            // Check if order can be cancelled
            if (order.status === "COMPLETED") {
                throw new error_middleware_js_1.ConflictError("Cannot cancel completed order");
            }
            if (order.status === "CANCELLED") {
                throw new error_middleware_js_1.ConflictError("Order is already cancelled");
            }
            const updatedOrder = await database_js_1.prisma.order.update({
                where: { id },
                data: {
                    status: "CANCELLED",
                    notes: reason ? `Cancelled: ${reason}` : undefined,
                },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    pricePaise: true,
                                    imageUrl: true,
                                    isVeg: true,
                                },
                            },
                        },
                    },
                },
            });
            // Clear cache
            await redis_1.CacheService.del(`order:${id}`);
            await redis_1.CacheService.delPattern("orders:*");
            logger_js_1.loggers.info("Order cancelled", {
                orderId: id,
                reason,
            });
            return updatedOrder;
        }
        catch (error) {
            logger_js_1.loggers.error("Cancel order failed:", error);
            throw error;
        }
    }
    static async getOrderAnalytics(startDate, endDate) {
        try {
            const where = {};
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    where.createdAt.lte = new Date(endDate);
                }
            }
            const [totalOrders, totalRevenue, ordersByStatus, ordersByType, averageOrderValue, topItems,] = await Promise.all([
                database_js_1.prisma.order.count({ where }),
                database_js_1.prisma.order.aggregate({
                    where,
                    _sum: { totalPaise: true },
                }),
                database_js_1.prisma.order.groupBy({
                    by: ["status"],
                    where,
                    _count: { status: true },
                }),
                database_js_1.prisma.order.groupBy({
                    by: ["orderType"],
                    where,
                    _count: { orderType: true },
                }),
                database_js_1.prisma.order.aggregate({
                    where,
                    _avg: { totalPaise: true },
                }),
                database_js_1.prisma.orderItem.groupBy({
                    by: ["menuItemId"],
                    where: {
                        order: where,
                    },
                    _sum: { quantity: true },
                    orderBy: { _sum: { quantity: "desc" } },
                    take: 10,
                }),
            ]);
            // Get menu item details for top items
            const topItemIds = topItems.map((item) => item.menuItemId);
            const menuItems = await database_js_1.prisma.menuItem.findMany({
                where: { id: { in: topItemIds } },
                select: { id: true, name: true },
            });
            const topItemsWithDetails = topItems.map((item) => {
                const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
                return {
                    menuItemId: item.menuItemId,
                    menuItemName: menuItem?.name || "Unknown",
                    totalQuantity: item._sum.quantity || 0,
                };
            });
            return {
                totalOrders,
                totalRevenue: totalRevenue._sum.totalPaise || 0,
                averageOrderValue: averageOrderValue._avg.totalPaise || 0,
                ordersByStatus: ordersByStatus.reduce((acc, item) => {
                    acc[item.status] = item._count.status;
                    return acc;
                }, {}),
                ordersByType: ordersByType.reduce((acc, item) => {
                    acc[item.orderType] = item._count.orderType;
                    return acc;
                }, {}),
                topItems: topItemsWithDetails,
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get order analytics failed:", error);
            throw error;
        }
    }
    static async getOrdersByStatus(status, page = 1, limit = 10) {
        const orderStatus = status;
        try {
            const skip = (page - 1) * limit;
            const [orders, total] = await Promise.all([
                database_js_1.prisma.order.findMany({
                    skip,
                    take: limit,
                    where: { status: orderStatus },
                    include: {
                        items: {
                            include: {
                                menuItem: {
                                    select: {
                                        id: true,
                                        name: true,
                                        pricePaise: true,
                                        imageUrl: true,
                                        isVeg: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }),
                database_js_1.prisma.order.count({ where: { status: orderStatus } }),
            ]);
            return {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get orders by status failed:", error);
            throw error;
        }
    }
    static async getTodaysOrders(page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const where = {
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
            };
            const [orders, total] = await Promise.all([
                database_js_1.prisma.order.findMany({
                    skip,
                    take: limit,
                    where,
                    include: {
                        items: {
                            include: {
                                menuItem: {
                                    select: {
                                        id: true,
                                        name: true,
                                        pricePaise: true,
                                        imageUrl: true,
                                        isVeg: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }),
                database_js_1.prisma.order.count({ where }),
            ]);
            return {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_js_1.loggers.error("Get today's orders failed:", error);
            throw error;
        }
    }
}
exports.OrderService = OrderService;
