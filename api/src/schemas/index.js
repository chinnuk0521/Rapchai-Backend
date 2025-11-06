"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploadSchema = exports.menuQuerySchema = exports.orderQuerySchema = exports.paginationSchema = exports.updateUserSchema = exports.createUserSchema = exports.updateBookingStatusSchema = exports.createBookingSchema = exports.updateEventSchema = exports.createEventSchema = exports.updatePaymentStatusSchema = exports.updateOrderStatusSchema = exports.createOrderSchema = exports.updateMenuItemSchema = exports.createMenuItemSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.registerSchema = exports.loginSchema = exports.cuidSchema = exports.phoneSchema = exports.passwordSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
// Common validation schemas
exports.emailSchema = zod_1.z.string().email("Invalid email format");
exports.passwordSchema = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters");
exports.phoneSchema = zod_1.z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format");
exports.cuidSchema = zod_1.z.string().cuid("Invalid ID format");
// Auth schemas
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
});
exports.registerSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name too long"),
    email: exports.emailSchema,
    password: exports.passwordSchema,
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, "Refresh token is required"),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: exports.passwordSchema,
    newPassword: exports.passwordSchema,
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: exports.emailSchema,
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "Reset token is required"),
    password: exports.passwordSchema,
});
// Menu schemas
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Category name must be at least 2 characters")
        .max(100, "Category name too long"),
    slug: zod_1.z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .max(100, "Slug too long"),
    description: zod_1.z.string().max(500, "Description too long").optional(),
    imageUrl: zod_1.z.string().url("Invalid image URL").optional(),
    sortOrder: zod_1.z.number().int().min(0).default(0),
});
exports.updateCategorySchema = exports.createCategorySchema.partial().extend({
    id: exports.cuidSchema,
    isActive: zod_1.z.boolean().optional(),
});
exports.createMenuItemSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Item name must be at least 2 characters")
        .max(100, "Item name too long"),
    description: zod_1.z.string().max(500, "Description too long").optional(),
    pricePaise: zod_1.z.number().int().min(0, "Price must be positive"),
    imageUrl: zod_1.z.string().url("Invalid image URL").optional(),
    isVeg: zod_1.z.boolean().default(true),
    isAvailable: zod_1.z.boolean().default(true),
    allergens: zod_1.z.array(zod_1.z.string()).default([]),
    calories: zod_1.z.number().int().min(0).optional(),
    prepTime: zod_1.z.number().int().min(0).optional(),
    categoryId: exports.cuidSchema,
    sortOrder: zod_1.z.number().int().min(0).default(0),
});
exports.updateMenuItemSchema = exports.createMenuItemSchema.partial().extend({
    id: exports.cuidSchema,
    isActive: zod_1.z.boolean().optional(),
});
// Order schemas
exports.createOrderSchema = zod_1.z.object({
    customerName: zod_1.z
        .string()
        .min(2, "Customer name must be at least 2 characters")
        .max(100, "Customer name too long"),
    customerPhone: exports.phoneSchema,
    customerEmail: exports.emailSchema.optional(),
    tableNumber: zod_1.z.string().max(20, "Table number too long").optional(),
    orderType: zod_1.z.enum(["dine-in", "takeaway", "delivery"]),
    notes: zod_1.z.string().max(500, "Notes too long").optional(),
    specialInstructions: zod_1.z
        .string()
        .max(500, "Special instructions too long")
        .optional(),
    items: zod_1.z
        .array(zod_1.z.object({
        menuItemId: exports.cuidSchema,
        quantity: zod_1.z.number().int().min(1, "Quantity must be at least 1"),
        notes: zod_1.z.string().max(200, "Item notes too long").optional(),
    }))
        .min(1, "Order must have at least one item"),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    id: exports.cuidSchema,
    status: zod_1.z.enum(["received", "preparing", "ready", "delivered", "cancelled"]),
});
exports.updatePaymentStatusSchema = zod_1.z.object({
    id: exports.cuidSchema,
    paymentStatus: zod_1.z.enum(["pending", "paid", "failed", "refunded"]),
});
// Event schemas
exports.createEventSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(2, "Event title must be at least 2 characters")
        .max(100, "Event title too long"),
    description: zod_1.z.string().max(1000, "Description too long").optional(),
    startAt: zod_1.z.string().datetime("Invalid start date"),
    endAt: zod_1.z.string().datetime("Invalid end date").optional(),
    imageUrl: zod_1.z.string().url("Invalid image URL").optional(),
    location: zod_1.z.string().max(200, "Location too long").optional(),
    externalUrl: zod_1.z.string().url("Invalid external URL").optional(),
    maxCapacity: zod_1.z.number().int().min(1).optional(),
    pricePaise: zod_1.z.number().int().min(0).optional(),
});
exports.updateEventSchema = exports.createEventSchema.partial().extend({
    id: exports.cuidSchema,
    isActive: zod_1.z.boolean().optional(),
});
// Booking schemas
exports.createBookingSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name too long"),
    phone: exports.phoneSchema,
    email: exports.emailSchema.optional(),
    partySize: zod_1.z
        .number()
        .int()
        .min(1, "Party size must be at least 1")
        .max(20, "Party size too large"),
    date: zod_1.z.string().datetime("Invalid date"),
    notes: zod_1.z.string().max(500, "Notes too long").optional(),
    eventId: exports.cuidSchema.optional(),
});
exports.updateBookingStatusSchema = zod_1.z.object({
    id: exports.cuidSchema,
    status: zod_1.z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]),
});
// Admin schemas
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name too long"),
    email: exports.emailSchema,
    password: exports.passwordSchema,
    role: zod_1.z.enum(["ADMIN", "CUSTOMER"]).default("CUSTOMER"),
});
exports.updateUserSchema = zod_1.z.object({
    id: exports.cuidSchema,
    name: zod_1.z.string().min(2).max(100).optional(),
    email: exports.emailSchema.optional(),
    role: zod_1.z.enum(["ADMIN", "CUSTOMER"]).optional(),
});
// Query schemas
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .transform(Number)
        .refine((n) => n > 0, "Page must be positive")
        .default("1"),
    limit: zod_1.z
        .string()
        .transform(Number)
        .refine((n) => n > 0 && n <= 100, "Limit must be between 1 and 100")
        .default("10"),
});
exports.orderQuerySchema = zod_1.z
    .object({
    status: zod_1.z
        .enum(["received", "preparing", "ready", "delivered", "cancelled"])
        .optional(),
    orderType: zod_1.z.enum(["dine-in", "takeaway", "delivery"]).optional(),
    paymentStatus: zod_1.z.enum(["pending", "paid", "failed", "refunded"]).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
})
    .merge(exports.paginationSchema);
exports.menuQuerySchema = zod_1.z
    .object({
    categoryId: exports.cuidSchema.optional(),
    isVeg: zod_1.z
        .string()
        .transform((val) => val === "true")
        .optional(),
    isAvailable: zod_1.z
        .string()
        .transform((val) => val === "true")
        .optional(),
    search: zod_1.z.string().max(100).optional(),
})
    .merge(exports.paginationSchema);
// File upload schemas
exports.fileUploadSchema = zod_1.z.object({
    fieldname: zod_1.z.string(),
    originalname: zod_1.z.string(),
    encoding: zod_1.z.string(),
    mimetype: zod_1.z.string(),
    size: zod_1.z.number().int().min(0),
    buffer: zod_1.z.instanceof(Buffer),
});
