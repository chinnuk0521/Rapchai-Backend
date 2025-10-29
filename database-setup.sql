-- ============================================
-- Rapchai Café - Complete Database Setup SQL
-- ============================================
-- This file contains all SQL scripts needed for Supabase setup
-- Run sections as needed in Supabase SQL Editor
-- ============================================

-- ============================================
-- SECTION 1: Supabase Storage Policies
-- ============================================
-- Purpose: Configure RLS policies for restaurant-images bucket
-- When to run: After creating the 'restaurant-images' bucket in Supabase Storage
-- ============================================

-- Step 1: Remove old policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

-- Step 2: Allow public uploads (INSERT) - for anonymous image uploads
CREATE POLICY "Allow public uploads to restaurant images"
ON storage.objects 
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'restaurant-images');

-- Step 3: Allow public reads (SELECT) - so images can be displayed publicly
CREATE POLICY "Public read access for restaurant images"
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'restaurant-images');

-- Step 4: Allow authenticated users to update images (optional)
CREATE POLICY "Authenticated users can update images"
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'restaurant-images')
WITH CHECK (bucket_id = 'restaurant-images');

-- Step 5: Allow authenticated users to delete images (optional)
CREATE POLICY "Authenticated users can delete images"
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'restaurant-images');

-- Step 6: Make bucket public for easy access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'restaurant-images';

-- ============================================
-- SECTION 2: Sample Menu Data (Optional)
-- ============================================
-- Purpose: Seed initial menu categories and items
-- When to run: After Prisma migrations are complete
-- Note: This is optional - menu can be added via Admin API
-- ============================================

-- Insert Categories
-- Note: Table and column names match Prisma schema (snake_case for tables, camelCase for columns)
INSERT INTO "categories" (id, name, slug, description, "createdAt", "updatedAt", "isActive") VALUES
('cat_chais', 'Chais & Signature Coffees', 'chais-coffees', 'Traditional Assam chai and signature coffees brewed with our special filter', NOW(), NOW(), true),
('cat_burgers', 'Mini Burgers', 'mini-burgers', 'Perfect bite-sized sliders in veg and non-veg options', NOW(), NOW(), true),
('cat_sandwiches', 'Sandwiches', 'sandwiches', 'Delicious sandwiches on our 4-inch sub bread', NOW(), NOW(), true),
('cat_rolls', 'Rolls & Soups', 'rolls-soups', 'Juicy rolls and perfect soups for cold days', NOW(), NOW(), true),
('cat_specials', 'Our Specials', 'our-specials', 'Chef special creations that have become staples', NOW(), NOW(), true),
('cat_squares', 'Our Squares', 'our-squares', 'Homemade biscuits - spicy, buttery, and fruity', NOW(), NOW(), true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Insert Menu Items
-- Note: Table name is "menu_items" (snake_case) as defined in Prisma schema
INSERT INTO "menu_items" (id, name, description, "pricePaise", "isVeg", "isAvailable", "isActive", "categoryId", "createdAt", "updatedAt") VALUES
-- Chais & Signature Coffees
('item_1', 'Traditional Assam Chai', 'Brewed from Assam leaves using our traditional filter for perfect decoction', 8000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_2', 'Masala Chai', 'Spiced chai with aromatic spices', 9000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_3', 'Ginger Chai', 'Warming ginger chai for cold days', 9000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_4', 'Cardamom Chai', 'Fragrant cardamom-infused chai', 10000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_5', 'Cold Chai', 'Refreshing iced chai perfect for warm days', 10000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_6', 'Signature Coffee', 'Our special coffee blend brewed with traditional filter', 12000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_7', 'Cappuccino', 'Rich espresso with steamed milk foam', 15000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_8', 'Latte', 'Smooth coffee with steamed milk', 14000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_9', 'Americano', 'Strong black coffee', 10000, true, true, true, 'cat_chais', NOW(), NOW()),
('item_10', 'Cold Coffee', 'Iced coffee with milk', 13000, true, true, true, 'cat_chais', NOW(), NOW()),

-- Mini Burgers
('item_11', 'Veg Mini Burger', 'Perfect bite-sized veg slider with fresh vegetables', 12000, true, true, true, 'cat_burgers', NOW(), NOW()),
('item_12', 'Chicken Mini Burger', 'Juicy chicken patty in a mini bun', 15000, false, true, true, 'cat_burgers', NOW(), NOW()),
('item_13', 'Beef Mini Burger', 'Tender beef patty slider', 18000, false, true, true, 'cat_burgers', NOW(), NOW()),
('item_14', 'Paneer Mini Burger', 'Cottage cheese patty with spices', 14000, true, true, true, 'cat_burgers', NOW(), NOW()),
('item_15', 'Fish Mini Burger', 'Crispy fish patty slider', 16000, false, true, true, 'cat_burgers', NOW(), NOW()),
('item_16', 'Mushroom Mini Burger', 'Grilled mushroom patty slider', 13000, true, true, true, 'cat_burgers', NOW(), NOW()),

-- Sandwiches
('item_17', 'Veg Sandwich', 'Fresh vegetables on our 4-inch sub bread', 10000, true, true, true, 'cat_sandwiches', NOW(), NOW()),
('item_18', 'Chicken Sandwich', 'Grilled chicken on 4-inch sub bread', 14000, false, true, true, 'cat_sandwiches', NOW(), NOW()),
('item_19', 'Beef Sandwich', 'Tender beef on 4-inch sub bread', 16000, false, true, true, 'cat_sandwiches', NOW(), NOW()),
('item_20', 'Paneer Sandwich', 'Cottage cheese with vegetables', 12000, true, true, true, 'cat_sandwiches', NOW(), NOW()),
('item_21', 'Egg Sandwich', 'Scrambled eggs with vegetables', 11000, false, true, true, 'cat_sandwiches', NOW(), NOW()),
('item_22', 'Grilled Cheese Sandwich', 'Melted cheese on toasted bread', 10000, true, true, true, 'cat_sandwiches', NOW(), NOW()),

-- Rolls & Soups
('item_23', 'Chicken Roll', 'Juicy chicken wrapped in soft bread', 12000, false, true, true, 'cat_rolls', NOW(), NOW()),
('item_24', 'Egg Roll', 'Scrambled eggs wrapped in soft bread', 10000, false, true, true, 'cat_rolls', NOW(), NOW()),
('item_25', 'Veg Roll', 'Fresh vegetables wrapped in soft bread', 9000, true, true, true, 'cat_rolls', NOW(), NOW()),
('item_26', 'Paneer Roll', 'Cottage cheese wrapped in soft bread', 11000, true, true, true, 'cat_rolls', NOW(), NOW()),
('item_27', 'Tomato Soup', 'Perfect soup for cold days', 8000, true, true, true, 'cat_rolls', NOW(), NOW()),
('item_28', 'Chicken Soup', 'Hearty chicken soup', 10000, false, true, true, 'cat_rolls', NOW(), NOW()),
('item_29', 'Vegetable Soup', 'Fresh vegetable soup', 8000, true, true, true, 'cat_rolls', NOW(), NOW()),
('item_30', 'Corn Soup', 'Sweet corn soup', 9000, true, true, true, 'cat_rolls', NOW(), NOW()),

-- Our Specials
('item_31', 'Chef Special Pasta', 'Our signature pasta creation', 18000, true, true, true, 'cat_specials', NOW(), NOW()),
('item_32', 'Special Chicken Curry', 'Chef special chicken curry', 20000, false, true, true, 'cat_specials', NOW(), NOW()),
('item_33', 'Rapchai Special Rice', 'Our unique rice preparation', 16000, true, true, true, 'cat_specials', NOW(), NOW()),
('item_34', 'Special Veggie Bowl', 'Healthy vegetable bowl', 15000, true, true, true, 'cat_specials', NOW(), NOW()),
('item_35', 'Chef Special Wrap', 'Our signature wrap creation', 14000, true, true, true, 'cat_specials', NOW(), NOW()),
('item_36', 'Special Fish Fry', 'Chef special fish preparation', 22000, false, true, true, 'cat_specials', NOW(), NOW()),

-- Our Squares
('item_37', 'Spicy Squares', 'Homemade spicy biscuits', 3000, true, true, true, 'cat_squares', NOW(), NOW()),
('item_38', 'Buttery Squares', 'Rich buttery homemade biscuits', 3000, true, true, true, 'cat_squares', NOW(), NOW()),
('item_39', 'Fruity Squares', 'Sweet fruity homemade biscuits', 3000, true, true, true, 'cat_squares', NOW(), NOW()),
('item_40', 'Chocolate Squares', 'Chocolate-flavored homemade biscuits', 3500, true, true, true, 'cat_squares', NOW(), NOW()),
('item_41', 'Mixed Squares', 'Assorted homemade biscuits', 4000, true, true, true, 'cat_squares', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "pricePaise" = EXCLUDED."pricePaise",
  "isVeg" = EXCLUDED."isVeg",
  "isAvailable" = EXCLUDED."isAvailable",
  "isActive" = EXCLUDED."isActive",
  "categoryId" = EXCLUDED."categoryId",
  "updatedAt" = NOW();

-- ============================================
-- SECTION 3: Database Schema Reference
-- ============================================
-- Purpose: Quick reference for table structure
-- Full schema: See backend/prisma/schema.prisma
-- ============================================

-- Key Tables (managed by Prisma):
-- 
-- categories
--   - id, name, slug, description, imageUrl, isActive, sortOrder, createdAt, updatedAt
--
-- menu_items  
--   - id, name, description, pricePaise, imageUrl, isVeg, isAvailable, isActive, 
--     categoryId, calories, prepTime, sortOrder, createdAt, updatedAt
--
-- events
--   - id, title, description, startAt, endAt, imageUrl, location, externalUrl,
--     maxCapacity, currentBookings, pricePaise, isActive, createdAt, updatedAt
--
-- bookings
--   - id, userId, name, phone, email, partySize, date, notes, status,
--     eventId, createdAt, updatedAt
--
-- orders
--   - id, orderNumber, customerName, customerPhone, customerEmail, tableNumber,
--     orderType, status, paymentStatus, totalPaise, notes, specialInstructions,
--     createdAt, updatedAt
--
-- users
--   - id, name, email, emailVerified, image, role, passwordHash, phone,
--     isActive, createdAt, updatedAt

-- ============================================
-- NOTES:
-- ============================================
-- 1. Prisma Migrations: Run migrations via Prisma CLI, not directly via SQL
--    Command: cd backend && npm run prisma:migrate
--
-- 2. Schema Definition: See backend/prisma/schema.prisma for complete table structure
--
-- 3. Menu Data: Section 2 is optional - menu can be managed via Admin API
--
-- 4. Storage Setup: Section 1 is required only if using Supabase Storage
--
-- 5. Usage: 
--    - Copy Section 1 to Supabase SQL Editor to set up storage policies
--    - Copy Section 2 to seed initial menu data (optional)
--    - Refer to Section 3 for quick schema reference
-- ============================================

