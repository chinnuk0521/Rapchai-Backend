import { PrismaClient, Role, OrderType, OrderStatus, PaymentStatus, BookingStatus } from "@prisma/client";
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Simple hash function for seeding
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@rapchai.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminPasswordHash = hashPassword(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" as Role, passwordHash: adminPasswordHash },
    create: {
      email: adminEmail,
      name: "Rapchai Admin",
      role: "ADMIN" as Role,
      passwordHash: adminPasswordHash
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create categories
  const categories = [
    {
      name: "Chai/Coffee",
      slug: "chai-coffee",
      description: "Traditional Indian chai and premium coffee beverages",
      imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 1
    },
    {
      name: "Mini Burgers",
      slug: "mini-burgers", 
      description: "Perfectly sized burgers with premium ingredients",
      imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 2
    },
    {
      name: "Sandwiches",
      slug: "sandwiches",
      description: "Fresh sandwiches with local and international flavors",
      imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7fe?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 3
    },
    {
      name: "Rolls",
      slug: "rolls",
      description: "Delicious kathi rolls and wraps",
      imageUrl: "https://images.unsplash.com/photo-1604908176997-4314ea13f76e?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 4
    },
    {
      name: "Soups",
      slug: "soups",
      description: "Hearty soups perfect for any time",
      imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 5
    },
    {
      name: "Salads",
      slug: "salads",
      description: "Fresh and healthy salad options",
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a5731a2f0fb0?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 6
    },
    {
      name: "Steaks",
      slug: "steaks",
      description: "Premium quality steaks cooked to perfection",
      imageUrl: "https://images.unsplash.com/photo-1576402187879-ea8f72960641?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 7
    },
    {
      name: "Specials",
      slug: "specials",
      description: "Chef's special dishes and signature items",
      imageUrl: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 8
    },
    {
      name: "Squares",
      slug: "squares",
      description: "Sweet and savory square-shaped treats",
      imageUrl: "https://images.unsplash.com/photo-1558961363-fa1fdf82bad3?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      sortOrder: 9
    }
  ];

  const createdCategories = [];
  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: categoryData,
      create: categoryData,
    });
    createdCategories.push(category);
    console.log(`✅ Category created: ${category.name}`);
  }

  // Create menu items
  const menuItems = [
    // Chai/Coffee
    {
      name: "Masala Chai",
      description: "Traditional Indian spiced tea with aromatic spices",
      pricePaise: 7900, // ₹79
      imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 25,
      prepTime: 5,
      categoryId: createdCategories[0].id,
      sortOrder: 1
    },
    {
      name: "Filter Coffee",
      description: "South Indian style filter coffee",
      pricePaise: 8900, // ₹89
      imageUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 30,
      prepTime: 4,
      categoryId: createdCategories[0].id,
      sortOrder: 2
    },
    {
      name: "Cold Coffee",
      description: "Refreshing cold coffee with ice cream",
      pricePaise: 9900, // ₹99
      imageUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 150,
      prepTime: 3,
      categoryId: createdCategories[0].id,
      sortOrder: 3
    },

    // Mini Burgers
    {
      name: "Mini Burger – Classic",
      description: "Classic mini burger with fresh vegetables and sauce",
      pricePaise: 14900, // ₹149
      imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 320,
      prepTime: 8,
      categoryId: createdCategories[1].id,
      sortOrder: 1
    },
    {
      name: "Mini Burger – Chicken",
      description: "Mini burger with grilled chicken patty",
      pricePaise: 16900, // ₹169
      imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: true,
      calories: 380,
      prepTime: 10,
      categoryId: createdCategories[1].id,
      sortOrder: 2
    },
    {
      name: "Mini Burger – Beef",
      description: "Mini burger with premium beef patty",
      pricePaise: 17900, // ₹179
      imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: false,
      calories: 420,
      prepTime: 12,
      categoryId: createdCategories[1].id,
      sortOrder: 3
    },

    // Sandwiches
    {
      name: "Paneer Sandwich",
      description: "Grilled paneer sandwich with fresh vegetables",
      pricePaise: 18900, // ₹189
      imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7fe?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 350,
      prepTime: 7,
      categoryId: createdCategories[2].id,
      sortOrder: 1
    },
    {
      name: "Chicken Sandwich",
      description: "Grilled chicken sandwich with herbs and spices",
      pricePaise: 19900, // ₹199
      imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7fe?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: true,
      calories: 420,
      prepTime: 9,
      categoryId: createdCategories[2].id,
      sortOrder: 2
    },
    {
      name: "Beef Sandwich",
      description: "Premium beef sandwich with caramelized onions",
      pricePaise: 20900, // ₹209
      imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7fe?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: true,
      calories: 480,
      prepTime: 11,
      categoryId: createdCategories[2].id,
      sortOrder: 3
    },

    // Rolls
    {
      name: "Paneer Kathi Roll",
      description: "Paneer kathi roll with onions and chutney",
      pricePaise: 19900, // ₹199
      imageUrl: "https://images.unsplash.com/photo-1604908176997-4314ea13f76e?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 380,
      prepTime: 6,
      categoryId: createdCategories[3].id,
      sortOrder: 1
    },
    {
      name: "Chicken Kathi Roll",
      description: "Chicken kathi roll with spices and herbs",
      pricePaise: 21900, // ₹219
      imageUrl: "https://images.unsplash.com/photo-1604908176997-4314ea13f76e?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: true,
      calories: 450,
      prepTime: 8,
      categoryId: createdCategories[3].id,
      sortOrder: 2
    },

    // Soups
    {
      name: "Tomato Soup",
      description: "Fresh tomato soup with herbs",
      pricePaise: 14900, // ₹149
      imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 120,
      prepTime: 5,
      categoryId: createdCategories[4].id,
      sortOrder: 1
    },
    {
      name: "Chicken Soup",
      description: "Hearty chicken soup with vegetables",
      pricePaise: 16900, // ₹169
      imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: true,
      calories: 180,
      prepTime: 7,
      categoryId: createdCategories[4].id,
      sortOrder: 2
    },

    // Salads
    {
      name: "Caesar Salad",
      description: "Classic Caesar salad with fresh lettuce and dressing",
      pricePaise: 21900, // ₹219
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a5731a2f0fb0?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 200,
      prepTime: 5,
      categoryId: createdCategories[5].id,
      sortOrder: 1
    },
    {
      name: "Chicken Salad",
      description: "Grilled chicken salad with mixed greens",
      pricePaise: 23900, // ₹239
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a5731a2f0fb0?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: true,
      calories: 280,
      prepTime: 6,
      categoryId: createdCategories[5].id,
      sortOrder: 2
    },

    // Steaks
    {
      name: "Grilled Steak",
      description: "Premium grilled steak cooked to perfection",
      pricePaise: 39900, // ₹399
      imageUrl: "https://images.unsplash.com/photo-1576402187879-ea8f72960641?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: false,
      calories: 650,
      prepTime: 20,
      categoryId: createdCategories[6].id,
      sortOrder: 1
    },

    // Specials
    {
      name: "Rapchai Special",
      description: "Our signature dish with unique flavors",
      pricePaise: 22900, // ₹229
      imageUrl: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 400,
      prepTime: 12,
      categoryId: createdCategories[7].id,
      sortOrder: 1
    },
    {
      name: "Chef's Special",
      description: "Chef's recommended dish of the day",
      pricePaise: 24900, // ₹249
      imageUrl: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: false,
      isAvailable: true,
      calories: 450,
      prepTime: 15,
      categoryId: createdCategories[7].id,
      sortOrder: 2
    },

    // Squares
    {
      name: "Chocolate Square",
      description: "Rich chocolate square dessert",
      pricePaise: 9900, // ₹99
      imageUrl: "https://images.unsplash.com/photo-1558961363-fa1fdf82bad3?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 280,
      prepTime: 3,
      categoryId: createdCategories[8].id,
      sortOrder: 1
    },
    {
      name: "Butter Square",
      description: "Traditional butter square with nuts",
      pricePaise: 8900, // ₹89
      imageUrl: "https://images.unsplash.com/photo-1558961363-fa1fdf82bad3?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      isVeg: true,
      isAvailable: true,
      calories: 320,
      prepTime: 3,
      categoryId: createdCategories[8].id,
      sortOrder: 2
    }
  ];

  for (const itemData of menuItems) {
    const item = await prisma.menuItem.create({
      data: itemData,
    });
    console.log(`✅ Menu item created: ${item.name}`);
  }

  // Create events
  const events = [
    {
      title: "Rap Night Live #47",
      description: "Open mic rap battles, freestyle cyphers, and live performances",
      startAt: new Date("2024-02-24T19:00:00Z"),
      endAt: new Date("2024-02-24T22:00:00Z"),
      imageUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1600&h=900&fit=crop&crop=center&auto=format&q=80",
      location: "Rapchai Café",
      maxCapacity: 50,
      currentBookings: 0,
      pricePaise: 0, // Free entry
      isActive: true
    },
    {
      title: "Community Open Mic",
      description: "All genres welcome - rap, poetry, spoken word, and acoustic performances",
      startAt: new Date("2024-02-25T18:00:00Z"),
      endAt: new Date("2024-02-25T21:00:00Z"),
      imageUrl: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=1600&h=900&fit=crop&crop=center&auto=format&q=80",
      location: "Rapchai Café",
      maxCapacity: 30,
      currentBookings: 0,
      pricePaise: 5000, // ₹50 entry
      isActive: true
    },
    {
      title: "Beat Making Workshop",
      description: "Learn beat production basics with local producers. Bring your laptop!",
      startAt: new Date("2024-02-26T14:00:00Z"),
      endAt: new Date("2024-02-26T17:00:00Z"),
      imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&h=900&fit=crop&crop=center&auto=format&q=80",
      location: "Rapchai Café",
      maxCapacity: 15,
      currentBookings: 0,
      pricePaise: 20000, // ₹200 workshop
      isActive: true
    }
  ];

  for (const eventData of events) {
    const event = await prisma.event.create({
      data: eventData,
    });
    console.log(`✅ Event created: ${event.title}`);
  }

  // Create sample orders
  const sampleOrders = [
    {
      orderNumber: "RC240001",
      customerName: "John Doe",
      customerPhone: "+919876543210",
      customerEmail: "john@example.com",
      tableNumber: "5",
      orderType: "DINE_IN" as OrderType,
      status: "PENDING" as OrderStatus,
      paymentStatus: "PENDING" as PaymentStatus,
      totalPaise: 34700, // ₹347
      notes: "Extra spicy",
      specialInstructions: "No onions",
      estimatedPrepTime: 15
    },
    {
      orderNumber: "RC240002", 
      customerName: "Jane Smith",
      customerPhone: "+919876543211",
      customerEmail: "jane@example.com",
      orderType: "TAKEAWAY" as OrderType,
      status: "PREPARING" as OrderStatus,
      paymentStatus: "PAID" as PaymentStatus,
      totalPaise: 29800, // ₹298
      notes: "Pack well for travel",
      estimatedPrepTime: 12
    }
  ];

  for (const orderData of sampleOrders) {
    const order = await prisma.order.create({
      data: orderData,
    });
    console.log(`✅ Sample order created: ${order.orderNumber}`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
