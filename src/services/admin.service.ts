import { prisma } from '@/config/database.js';
import { CacheService } from '@/config/redis';
import { AppError, NotFoundError, ConflictError } from '@/middleware/error.middleware.js';
import { loggers } from '@/utils/logger.js';
import { BookingStatus } from '../generated/prisma/enums';
import type { 
  CreateEventInput,
  UpdateEventInput,
  CreateBookingInput 
} from '@/schemas/index.js';

export class AdminService {
  // Dashboard Analytics
  static async getDashboardAnalytics(startDate?: string, endDate?: string) {
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
        totalCustomers,
        totalBookings,
        recentOrders,
        recentBookings,
        ordersByStatus,
        ordersByType,
      ] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.aggregate({
          where,
          _sum: { totalPaise: true },
        }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.booking.count(),
        prisma.order.findMany({
          where,
          take: 5,
          include: {
            items: {
              include: {
                menuItem: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.booking.findMany({
          take: 5,
          include: {
            event: {
              select: { title: true },
            },
          },
          orderBy: { createdAt: 'desc' },
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
      ]);

      return {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalPaise || 0,
        totalCustomers,
        totalBookings,
        recentOrders,
        recentBookings,
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as any),
        ordersByType: ordersByType.reduce((acc, item) => {
          acc[item.orderType] = item._count.orderType;
          return acc;
        }, {} as any),
      };
    } catch (error: any) {
      loggers.error('Get dashboard analytics failed:', error);
      throw error;
    }
  }

  // Events Management
  static async getAllEvents(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          skip,
          take: limit,
          include: {
            bookings: {
              select: {
                id: true,
                name: true,
                partySize: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.event.count(),
      ]);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      loggers.error('Get all events failed:', error);
      throw error;
    }
  }

  static async getEventById(id: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          bookings: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      return event;
    } catch (error: any) {
      loggers.error('Get event by ID failed:', error);
      throw error;
    }
  }

  static async createEvent(data: CreateEventInput) {
    try {
      const event = await prisma.event.create({
        data: {
          title: data.title,
          description: data.description,
          startAt: new Date(data.startAt),
          endAt: data.endAt ? new Date(data.endAt) : null,
          imageUrl: data.imageUrl,
          location: data.location,
          externalUrl: data.externalUrl,
          maxCapacity: data.maxCapacity,
          pricePaise: data.pricePaise,
        },
        include: {
          bookings: true,
        },
      });

      loggers.info('Event created successfully', { eventId: event.id });

      return event;
    } catch (error: any) {
      loggers.error('Create event failed:', error);
      throw error;
    }
  }

  static async updateEvent(id: string, data: UpdateEventInput) {
    try {
      const existingEvent = await prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent) {
        throw new NotFoundError('Event not found');
      }

      const event = await prisma.event.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.startAt && { startAt: new Date(data.startAt) }),
          ...(data.endAt !== undefined && { endAt: data.endAt ? new Date(data.endAt) : null }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl }),
          ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
          ...(data.pricePaise !== undefined && { pricePaise: data.pricePaise }),
        },
        include: {
          bookings: true,
        },
      });

      loggers.info('Event updated successfully', { eventId: event.id });

      return event;
    } catch (error: any) {
      loggers.error('Update event failed:', error);
      throw error;
    }
  }

  static async deleteEvent(id: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { id },
        include: { bookings: true },
      });

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Check if event has bookings
      if (event.bookings.length > 0) {
        throw new ConflictError('Cannot delete event with existing bookings');
      }

      await prisma.event.delete({
        where: { id },
      });

      loggers.info('Event deleted successfully', { eventId: id });

      return { message: 'Event deleted successfully' };
    } catch (error: any) {
      loggers.error('Delete event failed:', error);
      throw error;
    }
  }

  // Bookings Management
  static async getAllBookings(query: any) {
    try {
      const { 
        status, 
        eventId, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 10 
      } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (eventId) {
        where.eventId = eventId;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate);
        }
        if (endDate) {
          where.date.lte = new Date(endDate);
        }
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          skip,
          take: limit,
          where,
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startAt: true,
                location: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.booking.count({ where }),
      ]);

      return {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      loggers.error('Get all bookings failed:', error);
      throw error;
    }
  }

  static async getBookingById(id: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              startAt: true,
              endAt: true,
              location: true,
              imageUrl: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      return booking;
    } catch (error: any) {
      loggers.error('Get booking by ID failed:', error);
      throw error;
    }
  }

  static async createBooking(data: any) {
    try {
      const { name, phone, email, partySize, date, notes, eventId } = data;

      // Validate event exists if eventId is provided
      if (eventId) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
        });

        if (!event) {
          throw new NotFoundError('Event not found');
        }

        // Check capacity if maxCapacity is set
        if (event.maxCapacity && event.currentBookings + partySize > event.maxCapacity) {
          throw new ConflictError('Event is fully booked');
        }
      }

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          name,
          phone,
          email: email || null,
          partySize,
          date: new Date(date),
          notes: notes || null,
          eventId: eventId || null,
          status: 'PENDING',
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true,
              endAt: true,
              location: true,
              imageUrl: true,
            },
          },
        },
      });

      // Update event booking count if eventId is provided
      if (eventId) {
        await prisma.event.update({
          where: { id: eventId },
          data: {
            currentBookings: {
              increment: partySize,
            },
          },
        });
      }

      loggers.info('Booking created successfully', { bookingId: booking.id });

      return booking;
    } catch (error: any) {
      loggers.error('Create booking failed:', error);
      throw error;
    }
  }

  static async updateBookingStatus(id: string, status: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: { status: status as BookingStatus },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true,
              location: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      loggers.info('Booking status updated', { 
        bookingId: id, 
        status 
      });

      return updatedBooking;
    } catch (error: any) {
      loggers.error('Update booking status failed:', error);
      throw error;
    }
  }

  // Media Management
  static async getAllMedia(query: any) {
    try {
      const { type, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (type) {
        where.type = type;
      }

      const [media, total] = await Promise.all([
        prisma.media.findMany({
          skip,
          take: limit,
          where,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.media.count({ where }),
      ]);

      return {
        media,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      loggers.error('Get all media failed:', error);
      throw error;
    }
  }

  static async uploadMedia(request: any) {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would:
      // 1. Validate file type and size
      // 2. Upload to MinIO/S3
      // 3. Save metadata to database
      
      const data = await request.file();
      
      if (!data) {
        throw new AppError('No file uploaded', 400);
      }

      // For now, just save the metadata
      const media = await prisma.media.create({
        data: {
          url: `uploads/${data.filename}`,
          caption: data.filename,
          type: data.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        },
      });

      loggers.info('Media uploaded successfully', { mediaId: media.id });

      return media;
    } catch (error: any) {
      loggers.error('Upload media failed:', error);
      throw error;
    }
  }

  static async deleteMedia(id: string) {
    try {
      const media = await prisma.media.findUnique({
        where: { id },
      });

      if (!media) {
        throw new NotFoundError('Media not found');
      }

      await prisma.media.delete({
        where: { id },
      });

      loggers.info('Media deleted successfully', { mediaId: id });

      return { message: 'Media deleted successfully' };
    } catch (error: any) {
      loggers.error('Delete media failed:', error);
      throw error;
    }
  }

  // System Settings
  static async getSystemSettings() {
    try {
      // This would typically come from a settings table
      // For now, return default settings
      return {
        restaurantName: 'Rapchai Café',
        restaurantAddress: '123 Main Street, City, State',
        restaurantPhone: '+1234567890',
        restaurantEmail: 'info@rapchai.com',
        openingHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '23:00' },
          saturday: { open: '09:00', close: '23:00' },
          sunday: { open: '09:00', close: '21:00' },
        },
        deliveryRadius: 5, // km
        deliveryFee: 200, // paise
        minOrderAmount: 500, // paise
        taxRate: 8.5, // percentage
      };
    } catch (error: any) {
      loggers.error('Get system settings failed:', error);
      throw error;
    }
  }

  static async updateSystemSettings(data: any) {
    try {
      // This would typically update a settings table
      // For now, just return the updated data
      
      loggers.info('System settings updated', { settings: data });

      return data;
    } catch (error: any) {
      loggers.error('Update system settings failed:', error);
      throw error;
    }
  }

  // Reports
  static async getSalesReport(startDate?: string, endDate?: string, groupBy: string = 'day') {
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

      const orders = await prisma.order.findMany({
        where,
        select: {
          id: true,
          totalPaise: true,
          createdAt: true,
          status: true,
          orderType: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const groupedData: { [key: string]: any } = {};
      
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        let key: string;
        
        switch (groupBy) {
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString().split('T')[0];
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            date: key,
            totalOrders: 0,
            totalRevenue: 0,
            ordersByType: {},
            ordersByStatus: {},
          };
        }

        groupedData[key].totalOrders++;
        groupedData[key].totalRevenue += order.totalPaise;
        
        groupedData[key].ordersByType[order.orderType] = 
          (groupedData[key].ordersByType[order.orderType] || 0) + 1;
        
        groupedData[key].ordersByStatus[order.status] = 
          (groupedData[key].ordersByStatus[order.status] || 0) + 1;
      });

      return {
        summary: {
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, order) => sum + order.totalPaise, 0),
          averageOrderValue: orders.length > 0 
            ? orders.reduce((sum, order) => sum + order.totalPaise, 0) / orders.length 
            : 0,
        },
        data: Object.values(groupedData),
      };
    } catch (error: any) {
      loggers.error('Get sales report failed:', error);
      throw error;
    }
  }

  static async getCustomerAnalytics(startDate?: string, endDate?: string) {
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
        totalCustomers,
        newCustomers,
        topCustomers,
        customerOrders,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({ 
          where: { 
            role: 'CUSTOMER',
            ...where,
          },
        }),
        prisma.order.groupBy({
          by: ['customerPhone'],
          where,
          _sum: { totalPaise: true },
          _count: { customerPhone: true },
          orderBy: { _sum: { totalPaise: 'desc' } },
          take: 10,
        }),
        prisma.order.findMany({
          where,
          select: {
            customerPhone: true,
            totalPaise: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        totalCustomers,
        newCustomers,
        topCustomers: topCustomers.map(customer => ({
          phone: customer.customerPhone,
          totalSpent: customer._sum.totalPaise || 0,
          orderCount: customer._count.customerPhone,
        })),
        customerOrders,
      };
    } catch (error: any) {
      loggers.error('Get customer analytics failed:', error);
      throw error;
    }
  }

  // Menu Items Management
  static async getAllMenuItems(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [menuItems, total] = await Promise.all([
        prisma.menuItem.findMany({
          skip,
          take: limit,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.menuItem.count(),
      ]);

      return {
        menuItems,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      loggers.error('Get all menu items failed:', error);
      throw error;
    }
  }

  static async createMenuItem(data: any) {
    try {
      const { categorySlug, ...menuItemData } = data;
      
      // Find category by slug
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      const menuItem = await prisma.menuItem.create({
        data: {
          ...menuItemData,
          categoryId: category.id,
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

      return menuItem;
    } catch (error: any) {
      loggers.error('Create menu item failed:', error);
      throw error;
    }
  }

  static async updateMenuItem(id: string, data: any) {
    try {
      const { categorySlug, ...updateData } = data;
      
      let updatePayload: any = updateData;
      
      if (categorySlug) {
        const category = await prisma.category.findUnique({
          where: { slug: categorySlug },
        });

        if (!category) {
          throw new NotFoundError('Category not found');
        }
        
        updatePayload.categoryId = category.id;
      }

      const menuItem = await prisma.menuItem.update({
        where: { id },
        data: updatePayload,
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

      return menuItem;
    } catch (error: any) {
      loggers.error('Update menu item failed:', error);
      throw error;
    }
  }

  static async deleteMenuItem(id: string) {
    try {
      await prisma.menuItem.delete({
        where: { id },
      });
    } catch (error: any) {
      loggers.error('Delete menu item failed:', error);
      throw error;
    }
  }

  // Categories Management
  static async getAllCategories() {
    try {
      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return categories;
    } catch (error: any) {
      loggers.error('Get all categories failed:', error);
      throw error;
    }
  }

  static async createCategory(data: any) {
    try {
      const category = await prisma.category.create({
        data,
      });

      return category;
    } catch (error: any) {
      loggers.error('Create category failed:', error);
      throw error;
    }
  }

  static async updateCategory(id: string, data: any) {
    try {
      const category = await prisma.category.update({
        where: { id },
        data,
      });

      return category;
    } catch (error: any) {
      loggers.error('Update category failed:', error);
      throw error;
    }
  }

  static async deleteCategory(id: string) {
    try {
      // Check if category has menu items
      const menuItemsCount = await prisma.menuItem.count({
        where: { categoryId: id },
      });

      if (menuItemsCount > 0) {
        throw new ConflictError('Cannot delete category with existing menu items');
      }

      await prisma.category.delete({
        where: { id },
      });
    } catch (error: any) {
      loggers.error('Delete category failed:', error);
      throw error;
    }
  }
}
