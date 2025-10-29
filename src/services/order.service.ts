import { prisma } from '@/config/database.js';
import { CacheService } from '@/config/redis';
import { AppError, NotFoundError, ConflictError } from '@/middleware/error.middleware.js';
import { loggers } from '@/utils/logger.js';
import { OrderType, OrderStatus, PaymentStatus } from '../generated/prisma/enums';
import type { 
  CreateOrderInput, 
  OrderQueryInput 
} from '@/schemas/index.js';

export class OrderService {
  static async createOrder(data: CreateOrderInput) {
    try {
      // Validate menu items exist and are available
      const menuItemIds = data.items.map(item => item.menuItemId);
      const menuItems = await prisma.menuItem.findMany({
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
        throw new NotFoundError('One or more menu items not found or unavailable');
      }

      // Calculate total
      let totalPaise = 0;
      const orderItems = data.items.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        if (!menuItem) {
          throw new NotFoundError(`Menu item ${item.menuItemId} not found`);
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

      // Create order with items
      const order = await prisma.order.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          tableNumber: data.tableNumber,
          orderType: data.orderType.toUpperCase().replace(/-/g, '_') as OrderType,
          notes: data.notes,
          specialInstructions: data.specialInstructions,
          totalPaise,
          status: 'PENDING',
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
      await CacheService.delPattern('orders:*');

      loggers.info('Order created successfully', { 
        orderId: order.id, 
        totalPaise: order.totalPaise 
      });

      return order;
    } catch (error: any) {
      loggers.error('Create order failed:', error);
      throw error;
    }
  }

  static async getAllOrders(query: OrderQueryInput) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        orderType, 
        paymentStatus, 
        startDate, 
        endDate 
      } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status) {
        where.status = status as OrderStatus;
      }

      if (orderType) {
        where.orderType = orderType;
      }

      if (paymentStatus) {
        where.paymentStatus = paymentStatus as PaymentStatus;
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
        prisma.order.findMany({
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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
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
    } catch (error: any) {
      loggers.error('Get all orders failed:', error);
      throw error;
    }
  }

  static async getOrderById(id: string) {
    try {
      const cacheKey = `order:${id}`;

      // Try cache first
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const order = await prisma.order.findUnique({
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
        throw new NotFoundError('Order not found');
      }

      // Cache for 5 minutes
      await CacheService.set(cacheKey, order, 300);

      return order;
    } catch (error: any) {
      loggers.error('Get order by ID failed:', error);
      throw error;
    }
  }

  static async getOrdersByCustomerPhone(phone: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where: { customerPhone: phone } }),
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
    } catch (error: any) {
      loggers.error('Get orders by customer phone failed:', error);
      throw error;
    }
  }

  static async updateOrderStatus(id: string, status: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Validate status transition
      const validTransitions: { [key: string]: string[] } = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PREPARING', 'CANCELLED'],
        PREPARING: ['READY', 'CANCELLED'],
        READY: ['COMPLETED'],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (!validTransitions[order.status]?.includes(status)) {
        throw new ConflictError(`Cannot change status from ${order.status} to ${status}`);
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status: status as OrderStatus },
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
      await CacheService.del(`order:${id}`);
      await CacheService.delPattern('orders:*');

      loggers.info('Order status updated', { 
        orderId: id, 
        oldStatus: order.status, 
        newStatus: status 
      });

      return updatedOrder;
    } catch (error: any) {
      loggers.error('Update order status failed:', error);
      throw error;
    }
  }

  static async updatePaymentStatus(id: string, paymentStatus: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { paymentStatus: paymentStatus as PaymentStatus },
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
      await CacheService.del(`order:${id}`);
      await CacheService.delPattern('orders:*');

      loggers.info('Payment status updated', { 
        orderId: id, 
        paymentStatus 
      });

      return updatedOrder;
    } catch (error: any) {
      loggers.error('Update payment status failed:', error);
      throw error;
    }
  }

  static async cancelOrder(id: string, reason?: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check if order can be cancelled
      if (order.status === 'COMPLETED') {
        throw new ConflictError('Cannot cancel completed order');
      }

      if (order.status === 'CANCELLED') {
        throw new ConflictError('Order is already cancelled');
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
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
      await CacheService.del(`order:${id}`);
      await CacheService.delPattern('orders:*');

      loggers.info('Order cancelled', { 
        orderId: id, 
        reason 
      });

      return updatedOrder;
    } catch (error: any) {
      loggers.error('Cancel order failed:', error);
      throw error;
    }
  }

  static async getOrderAnalytics(startDate?: string, endDate?: string) {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [
        totalOrders,
        totalRevenue,
        ordersByStatus,
        ordersByType,
        averageOrderValue,
        topItems,
      ] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.aggregate({
          where,
          _sum: { totalPaise: true },
        }),
        prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        prisma.order.groupBy({
          by: ['orderType'],
          where,
          _count: { orderType: true },
        }),
        prisma.order.aggregate({
          where,
          _avg: { totalPaise: true },
        }),
        prisma.orderItem.groupBy({
          by: ['menuItemId'],
          where: {
            order: where,
          },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        }),
      ]);

      // Get menu item details for top items
      const topItemIds = topItems.map(item => item.menuItemId);
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: topItemIds } },
        select: { id: true, name: true },
      });

      const topItemsWithDetails = topItems.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        return {
          menuItemId: item.menuItemId,
          menuItemName: menuItem?.name || 'Unknown',
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
        }, {} as any),
        ordersByType: ordersByType.reduce((acc, item) => {
          acc[item.orderType] = item._count.orderType;
          return acc;
        }, {} as any),
        topItems: topItemsWithDetails,
      };
    } catch (error: any) {
      loggers.error('Get order analytics failed:', error);
      throw error;
    }
  }

  static async getOrdersByStatus(status: string, page: number = 1, limit: number = 10) {
    const orderStatus = status as OrderStatus;
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where: { status } }),
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
    } catch (error: any) {
      loggers.error('Get orders by status failed:', error);
      throw error;
    }
  }

  static async getTodaysOrders(page: number = 1, limit: number = 10) {
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
        prisma.order.findMany({
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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
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
    } catch (error: any) {
      loggers.error('Get today\'s orders failed:', error);
      throw error;
    }
  }
}
