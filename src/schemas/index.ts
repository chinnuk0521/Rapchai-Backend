import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');
export const cuidSchema = z.string().cuid('Invalid ID format');

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: emailSchema,
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

// Menu schemas
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100, 'Category name too long'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(100, 'Slug too long'),
  description: z.string().max(500, 'Description too long').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: cuidSchema,
  isActive: z.boolean().optional(),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters').max(100, 'Item name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  pricePaise: z.number().int().min(0, 'Price must be positive'),
  imageUrl: z.string().url('Invalid image URL').optional(),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  allergens: z.array(z.string()).default([]),
  calories: z.number().int().min(0).optional(),
  prepTime: z.number().int().min(0).optional(),
  categoryId: cuidSchema,
  sortOrder: z.number().int().min(0).default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  id: cuidSchema,
  isActive: z.boolean().optional(),
});

// Order schemas
export const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters').max(100, 'Customer name too long'),
  customerPhone: phoneSchema,
  customerEmail: emailSchema.optional(),
  tableNumber: z.string().max(20, 'Table number too long').optional(),
  orderType: z.enum(['dine-in', 'takeaway', 'delivery']),
  notes: z.string().max(500, 'Notes too long').optional(),
  specialInstructions: z.string().max(500, 'Special instructions too long').optional(),
  items: z.array(z.object({
    menuItemId: cuidSchema,
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    notes: z.string().max(200, 'Item notes too long').optional(),
  })).min(1, 'Order must have at least one item'),
});

export const updateOrderStatusSchema = z.object({
  id: cuidSchema,
  status: z.enum(['received', 'preparing', 'ready', 'delivered', 'cancelled']),
});

export const updatePaymentStatusSchema = z.object({
  id: cuidSchema,
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
});

// Event schemas
export const createEventSchema = z.object({
  title: z.string().min(2, 'Event title must be at least 2 characters').max(100, 'Event title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  startAt: z.string().datetime('Invalid start date'),
  endAt: z.string().datetime('Invalid end date').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  location: z.string().max(200, 'Location too long').optional(),
  externalUrl: z.string().url('Invalid external URL').optional(),
  maxCapacity: z.number().int().min(1).optional(),
  pricePaise: z.number().int().min(0).optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  id: cuidSchema,
  isActive: z.boolean().optional(),
});

// Booking schemas
export const createBookingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  phone: phoneSchema,
  email: emailSchema.optional(),
  partySize: z.number().int().min(1, 'Party size must be at least 1').max(20, 'Party size too large'),
  date: z.string().datetime('Invalid date'),
  notes: z.string().max(500, 'Notes too long').optional(),
  eventId: cuidSchema.optional(),
});

export const updateBookingStatusSchema = z.object({
  id: cuidSchema,
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
});

// Admin schemas
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['ADMIN', 'CUSTOMER']).default('CUSTOMER'),
});

export const updateUserSchema = z.object({
  id: cuidSchema,
  name: z.string().min(2).max(100).optional(),
  email: emailSchema.optional(),
  role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
});

// Query schemas
export const paginationSchema = z.object({
  page: z.string().transform(Number).refine(n => n > 0, 'Page must be positive').default('1'),
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').default('10'),
});

export const orderQuerySchema = z.object({
  status: z.enum(['received', 'preparing', 'ready', 'delivered', 'cancelled']).optional(),
  orderType: z.enum(['dine-in', 'takeaway', 'delivery']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).merge(paginationSchema);

export const menuQuerySchema = z.object({
  categoryId: cuidSchema.optional(),
  isVeg: z.string().transform(val => val === 'true').optional(),
  isAvailable: z.string().transform(val => val === 'true').optional(),
  search: z.string().max(100).optional(),
}).merge(paginationSchema);

// File upload schemas
export const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number().int().min(0),
  buffer: z.instanceof(Buffer),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type PaginationInput = z.infer<typeof paginationSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type MenuQueryInput = z.infer<typeof menuQuerySchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
