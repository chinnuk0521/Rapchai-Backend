import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { prisma } from '@/config/database.js';
import { asyncHandler } from '@/middleware/error.middleware.js';

async function eventsRoutes(fastify: FastifyInstance) {
  // Public Events API - No authentication required
  
  // Get all public events
  fastify.get('/events', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit } = request.query as any;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const skip = (pageNum - 1) * limitNum;

    try {
      const [events, total] = await Promise.all([
        prisma.event.findMany({
          skip,
          take: limitNum,
          where: {
            isActive: true, // Only show active events
          },
          select: {
            id: true,
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            imageUrl: true,
            location: true,
            maxCapacity: true,
            currentBookings: true,
            pricePaise: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { startAt: 'asc' }, // Order by start date
        }),
        prisma.event.count({
          where: {
            isActive: true,
          },
        }),
      ]);

      return reply.send({
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching public events:', error);
      throw error;
    }
  }));

  // Get event by ID (public)
  fastify.get('/events/:id', asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;

    try {
      const event = await prisma.event.findUnique({
        where: { 
          id,
          isActive: true, // Only show active events
        },
        select: {
          id: true,
          title: true,
          description: true,
          startAt: true,
          endAt: true,
          imageUrl: true,
          location: true,
          maxCapacity: true,
          currentBookings: true,
          pricePaise: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!event) {
        return reply.status(404).send({
          error: 'Event not found',
          message: 'The requested event does not exist or is not active',
          statusCode: 404,
        });
      }

      return reply.send({ event });
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  }));
}

export default eventsRoutes;
