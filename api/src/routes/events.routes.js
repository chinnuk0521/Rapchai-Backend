"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_js_1 = require("../config/database.js");
const error_middleware_js_1 = require("../middleware/error.middleware.js");
async function eventsRoutes(fastify) {
    // Public Events API - No authentication required
    // Get all public events
    fastify.get("/events", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { page, limit } = request.query;
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const skip = (pageNum - 1) * limitNum;
        try {
            const [events, total] = await Promise.all([
                database_js_1.prisma.event.findMany({
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
                    orderBy: { startAt: "asc" }, // Order by start date
                }),
                database_js_1.prisma.event.count({
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
        }
        catch (error) {
            console.error("Error fetching public events:", error);
            throw error;
        }
    }));
    // Get event by ID (public)
    fastify.get("/events/:id", (0, error_middleware_js_1.asyncHandler)(async (request, reply) => {
        const { id } = request.params;
        try {
            const event = await database_js_1.prisma.event.findUnique({
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
                    error: "Event not found",
                    message: "The requested event does not exist or is not active",
                    statusCode: 404,
                });
            }
            return reply.send({ event });
        }
        catch (error) {
            console.error("Error fetching event by ID:", error);
            throw error;
        }
    }));
}
exports.default = eventsRoutes;
