const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding categories and menu items...');

  // Add categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'hot-beverages' },
      update: { name: 'Hot Beverages', slug: 'hot-beverages', description: 'Warm drinks' },
      create: { name: 'Hot Beverages', slug: 'hot-beverages', description: 'Warm drinks' }
    }),
    prisma.category.upsert({
      where: { slug: 'cold-beverages' },
      update: { name: 'Cold Beverages', slug: 'cold-beverages', description: 'Cold drinks' },
      create: { name: 'Cold Beverages', slug: 'cold-beverages', description: 'Cold drinks' }
    }),
    prisma.category.upsert({
      where: { slug: 'appetizers' },
      update: { name: 'Appetizers', slug: 'appetizers', description: 'Starters' },
      create: { name: 'Appetizers', slug: 'appetizers', description: 'Starters' }
    }),
    prisma.category.upsert({
      where: { slug: 'main-course' },
      update: { name: 'Main Course', slug: 'main-course', description: 'Main dishes' },
      create: { name: 'Main Course', slug: 'main-course', description: 'Main dishes' }
    }),
    prisma.category.upsert({
      where: { slug: 'desserts' },
      update: { name: 'Desserts', slug: 'desserts', description: 'Sweet treats' },
      create: { name: 'Desserts', slug: 'desserts', description: 'Sweet treats' }
    })
  ]);

  console.log('✅ Categories added:', categories.length);

  // Get category IDs
  const hotBev = await prisma.category.findUnique({ where: { slug: 'hot-beverages' } });
  const coldBev = await prisma.category.findUnique({ where: { slug: 'cold-beverages' } });
  const apps = await prisma.category.findUnique({ where: { slug: 'appetizers' } });
  const main = await prisma.category.findUnique({ where: { slug: 'main-course' } });
  const desserts = await prisma.category.findUnique({ where: { slug: 'desserts' } });

  // Add menu items
  const items = await Promise.all([
    prisma.menuItem.create({
      data: { name: 'Cappuccino', description: 'Rich espresso with steamed milk foam', pricePaise: 18000, isVeg: true, categoryId: hotBev.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Masala Chai', description: 'Traditional spiced tea with milk', pricePaise: 8000, isVeg: true, categoryId: hotBev.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', pricePaise: 12000, isVeg: true, categoryId: coldBev.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Mango Lassi', description: 'Sweet mango yogurt drink', pricePaise: 14000, isVeg: true, categoryId: coldBev.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Samosa', description: 'Crispy fried pastry with spiced potato filling', pricePaise: 2500, isVeg: true, categoryId: apps.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Paneer Tikka', description: 'Grilled cottage cheese with spices', pricePaise: 18000, isVeg: true, categoryId: apps.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Chicken Wings', description: 'Spicy grilled chicken wings', pricePaise: 22000, isVeg: false, categoryId: apps.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Butter Chicken', description: 'Tender chicken in creamy tomato sauce', pricePaise: 35000, isVeg: false, categoryId: main.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Dal Makhani', description: 'Creamy black lentils', pricePaise: 28000, isVeg: true, categoryId: main.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Chicken Biryani', description: 'Fragrant basmati rice with spiced chicken', pricePaise: 32000, isVeg: false, categoryId: main.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Naan', description: 'Soft leavened bread', pricePaise: 8000, isVeg: true, categoryId: main.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Gulab Jamun', description: 'Sweet milk dumplings in rose syrup', pricePaise: 12000, isVeg: true, categoryId: desserts.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Ice Cream', description: 'Vanilla ice cream', pricePaise: 8000, isVeg: true, categoryId: desserts.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Chocolate Cake', description: 'Rich chocolate cake', pricePaise: 20000, isVeg: true, categoryId: desserts.id }
    }),
    prisma.menuItem.create({
      data: { name: 'Tiramisu', description: 'Classic Italian dessert', pricePaise: 25000, isVeg: true, categoryId: desserts.id }
    })
  ]);

  console.log('✅ Menu items added:', items.length);
  console.log('🎉 Database populated successfully!');
  await prisma.$disconnect();
}

main().catch(console.error);
