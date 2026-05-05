import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/password.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.expense.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create users with hashed passwords
  const password1 = await hashPassword("SecurePassword123!");
  const password2 = await hashPassword("AnotherPassword456@");

  const user1 = await prisma.user.create({
    data: {
      email: "john.doe@example.com",
      name: "John Doe",
      passwordHash: password1,
      role: "USER",
      emailVerified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "jane.smith@example.com",
      name: "Jane Smith",
      passwordHash: password2,
      role: "USER",
      emailVerified: true,
    },
  });

  // Create admin user
  const adminPassword = await hashPassword("AdminPassword789#");
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: adminPassword,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  console.log("✅ Created users:", [user1.id, user2.id, adminUser.id]);
  console.log("📝 Test credentials:");
  console.log(`   User 1: john.doe@example.com / SecurePassword123!`);
  console.log(`   User 2: jane.smith@example.com / AnotherPassword456@`);
  console.log(`   Admin: admin@example.com / AdminPassword789#`);

  // Create categories for user1
  const groceryCategory = await prisma.category.create({
    data: {
      name: "Groceries",
      description: "Food and grocery shopping",
      color: "#10B981", // Green
      icon: "🛒",
      userId: user1.id,
    },
  });

  const transportCategory = await prisma.category.create({
    data: {
      name: "Transportation",
      description: "Gas, parking, public transport",
      color: "#F59E0B", // Amber
      icon: "🚗",
      userId: user1.id,
    },
  });

  const entertainmentCategory = await prisma.category.create({
    data: {
      name: "Entertainment",
      description: "Movies, games, hobbies",
      color: "#EC4899", // Pink
      icon: "🎬",
      userId: user1.id,
    },
  });

  const utilitiesCategory = await prisma.category.create({
    data: {
      name: "Utilities",
      description: "Electricity, water, internet",
      color: "#6366F1", // Indigo
      icon: "⚡",
      userId: user1.id,
    },
  });

  const healthCategory = await prisma.category.create({
    data: {
      name: "Health & Fitness",
      description: "Doctor visits, gym, medicines",
      color: "#EF4444", // Red
      icon: "🏥",
      userId: user1.id,
    },
  });

  console.log("✅ Created categories for user1");

  // Create categories for user2
  const diningCategory = await prisma.category.create({
    data: {
      name: "Dining",
      description: "Restaurants and food delivery",
      color: "#F97316", // Orange
      icon: "🍽️",
      userId: user2.id,
    },
  });

  const shoppingCategory = await prisma.category.create({
    data: {
      name: "Shopping",
      description: "Clothes and personal items",
      color: "#8B5CF6", // Violet
      icon: "🛍️",
      userId: user2.id,
    },
  });

  console.log("✅ Created categories for user2");

  // Create expenses for user1
  const now = new Date();
  const expenses = await Promise.all([
    prisma.expense.create({
      data: {
        amount: 45.99,
        description: "Weekly groceries",
        date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        notes: "Bought vegetables and dairy",
        userId: user1.id,
        categoryId: groceryCategory.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 65.0,
        description: "Gas fill-up",
        date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        notes: "Filled up at Shell station",
        userId: user1.id,
        categoryId: transportCategory.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 120.0,
        description: "Monthly gym membership",
        date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        notes: "Annual renewal for fitness center",
        userId: user1.id,
        categoryId: healthCategory.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 15.99,
        description: "Movie tickets",
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        notes: "Watched the latest Marvel movie",
        userId: user1.id,
        categoryId: entertainmentCategory.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 89.5,
        description: "Internet bill",
        date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        notes: "Monthly internet subscription",
        userId: user1.id,
        categoryId: utilitiesCategory.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 32.5,
        description: "Groceries top-up",
        date: now, // Today
        notes: "Fresh fruits and bread",
        userId: user1.id,
        categoryId: groceryCategory.id,
      },
    }),
    // Expenses for user2
    prisma.expense.create({
      data: {
        amount: 58.75,
        description: "Dinner at Italian restaurant",
        date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        notes: "Celebration dinner with friends",
        userId: user2.id,
        categoryId: diningCategory.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 149.99,
        description: "New winter jacket",
        date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        notes: "Winter sale purchase",
        userId: user2.id,
        categoryId: shoppingCategory.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 42.0,
        description: "Lunch meeting",
        date: now, // Today
        notes: "Lunch with business partner",
        userId: user2.id,
        categoryId: diningCategory.id,
      },
    }),
  ]);

  console.log("✅ Created", expenses.length, "sample expenses");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📚 API Authentication Documentation:");
  console.log("   - Register: POST /api/auth/register");
  console.log("   - Login: POST /api/auth/login");
  console.log("   - Refresh Token: POST /api/auth/refresh");
  console.log("   - Get Profile: GET /api/auth/me (requires token)");
  console.log("   - Logout: POST /api/auth/logout (requires token)");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
