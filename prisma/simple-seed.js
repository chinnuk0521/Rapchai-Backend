const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding with 15 items...');

  // Create admin user
  const adminEmail = "chandu.kalluru@outlook.com";
  const adminPassword = "Kalluru@145";
  const adminPasswordHash = await argon2.hash(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { 
      role: "ADMIN", 
      passwordHash: adminPasswordHash,
      name: "Chandu Kalluru"
    },
    create: { 
      email: adminEmail, 
      name: "Chandu Kalluru", 
      role: "ADMIN", 
      passwordHash: adminPasswordHash 
    },
  });

  console.log('✅ Admin user created/updated:', adminUser.email);

  // Create categories
  const categories = [
    {
      name: "Hot Beverages",
      slug: "hot-beverages",
      description: "Warm and comforting drinks",
    },
    {
      name: "Cold Beverages", 
      slug: "cold-beverages",
      description: "Refreshing cold drinks",
    },
    {
      name: "Appetizers",
      slug: "appetizers",
      description: "Start your meal right",
    },
    {
      name: "Main Course",
      slug: "main-course", 
      description: "Hearty main dishes",
    },
    {
      name: "Desserts",
      slug: "desserts",
      description: "Sweet endings",
    },
  ];

  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: categoryData,
      create: categoryData,
    });
    console.log('✅ Category created:', category.name);
  }

  // Create 15 menu items without images
  const menuItems = [
    {
      name: "Cappuccino",
      description: "Rich espresso with steamed milk foam",
      pricePaise: 18000,
      isVeg: true,
      categorySlug: "hot-beverages",
    },
    {
      name: "Masala Chai",
      description: "Traditional spiced tea with milk",
      pricePaise: 8000,
      isVeg: true,
      categorySlug: "hot-beverages",
    },
    {
      name: "Fresh Orange Juice",
      description: "Freshly squeezed orange juice",
      pricePaise: 12000,
      isVeg: true,
      categorySlug: "cold-beverages",
    },
    {
      name: "Mango Lassi",
      description: "Sweet mango yogurt drink",
      pricePaise: 14000,
      isVeg: true,
      categorySlug: "cold-beverages",
    },
    {
      name: "Samosa",
      description: "Crispy fried pastry with spiced potato filling",
      pricePaise: 2500,
      isVeg: true,
      categorySlug: "appetizers",
    },
    {
      name: "Paneer Tikka",
      description: "Grilled cottage cheese with spices",
      pricePaise: 18000,
      isVeg: true,
      categorySlug: "appetizers",
    },
    {
      name: "Chicken Wings",
      description: "Spicy grilled chicken wings",
      pricePaise: 22000,
      isVeg: false,
      categorySlug: "appetizers",
    },
    {
      name: "Butter Chicken",
      description: "Tender chicken in creamy tomato sauce",
      pricePaise: 35000,
      isVeg: false,
      categorySlug: "main-course",
    },
    {
      name: "Dal Makhani",
      description: "Creamy black lentils",
      pricePaise: 28000,
      isVeg: true,
      categorySlug: "main-course",
    },
    {
      name: "Chicken Biryani",
      description: "Fragrant basmati rice with spiced chicken",
      pricePaise: 32000,
      isVeg: false,
      categorySlug: "main-course",
    },
    {
      name: "Naan",
      description: "Soft leavened bread",
      pricePaise: 8000,
      isVeg: true,
      categorySlug: "main-course",
    },
    {
      name: "Gulab Jamun",
      description: "Sweet milk dumplings in rose syrup",
      pricePaise: 12000,
      isVeg: true,
      categorySlug: "desserts",
    },
    {
      name: "Ice Cream",
      description: "Vanilla ice cream",
      pricePaise: 8000,
      isVeg: true,
      categorySlug: "desserts",
    },
    {
      name: "Chocolate Cake",
      description: "Rich chocolate cake",
      pricePaise: 20000,
      isVeg: true,
      categorySlug: "desserts",
    },
    {
      name: "Tiramisu",
      description: "Classic Italian dessert",
      pricePaise: 25000,
      isVeg: true,
      categorySlug: "desserts",
    },
  ];

  for (const itemData of menuItems) {
    const category = await prisma.category.findUnique({
      where: { slug: itemData.categorySlug },
    });

    if (category) {
      const { categorySlug, ...itemDataWithoutSlug } = itemData;
      const menuItem = await prisma.menuItem.create({
        data: {
          ...itemDataWithoutSlug,
          categoryId: category.id,
        },
      });
      console.log('✅ Menu item created:', menuItem.name);
    }
  }

  // Create sample orders
  const sampleOrders = [
    {
      customerName: "Rajesh Kumar",
      customerPhone: "+91-9876543210",
      customerEmail: "rajesh@example.com",
      orderType: "DINE_IN",
      status: "CONFIRMED",
      paymentStatus: "PAID",
      totalAmountPaise: 45000,
    },
    {
      customerName: "Priya Sharma",
      customerPhone: "+91-9876543211",
      customerEmail: "priya@example.com",
      orderType: "TAKEAWAY",
      status: "PREPARING",
      paymentStatus: "PENDING",
      totalAmountPaise: 32000,
    },
  ];

  // Get some menu items to create realistic orders
  const menuItemsForOrders = await prisma.menuItem.findMany({ take: 5 });
  
  for (let i = 0; i < sampleOrders.length; i++) {
    const orderData = sampleOrders[i];
    const randomMenuItem = menuItemsForOrders[i % menuItemsForOrders.length];
    
    const order = await prisma.order.create({
      data: {
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail,
        orderType: orderData.orderType,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        totalAmountPaise: orderData.totalAmountPaise,
        items: {
          create: [
            {
              menuItemId: randomMenuItem.id,
              quantity: 1,
              pricePaise: randomMenuItem.pricePaise,
            },
          ],
        },
      },
    });
    console.log('✅ Order created for:', order.customerName);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log(`📊 Created:`);
  console.log(`   - ${categories.length} categories`);
  console.log(`   - ${menuItems.length} menu items`);
  console.log(`   - ${sampleOrders.length} sample orders`);
  console.log(`   - 1 admin user`);
}

main()
.then(async () => {
  await prisma.$disconnect();
})
.catch(async (e) => {
  console.error('❌ Seeding failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
