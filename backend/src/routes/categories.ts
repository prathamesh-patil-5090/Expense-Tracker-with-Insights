import { Router, Request, Response } from "express";
import { prisma } from "../index.js";

const router = Router();

function getAuthorizedUserId(req: Request) {
  if (req.user?.userId) return req.user.userId;
  if (req.query.userId) return String(req.query.userId);
  if (req.body.userId) return String(req.body.userId);
  return null;
}

// Middleware to validate user exists
const validateUser = async (req: Request, res: Response, next: Function) => {
  const userId = getAuthorizedUserId(req);
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  (req as any).user = user;
  next();
};

// GET all categories for a user
router.get("/", validateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const categories = await prisma.category.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        icon: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const expenseTotals = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const totalsByCategoryId = new Map(
      expenseTotals.map((item) => [
        item.categoryId,
        {
          expenseCount: item._count.id,
          totalAmount: item._sum.amount || 0,
        },
      ])
    );

    const categoriesWithStats = categories.map((cat) => {
      const totals = totalsByCategoryId.get(cat.id) || { expenseCount: 0, totalAmount: 0 };
      return {
        ...cat,
        ...totals,
      };
    });

    res.json(categoriesWithStats);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET category by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        expenses: true,
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (req.user?.role !== "ADMIN" && category.userId !== req.user?.userId) {
      return res.status(403).json({ error: "Forbidden: Cannot access this category" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// CREATE new category
router.post("/", validateUser, async (req: Request, res: Response) => {
  try {
    const { name, description, color, icon } = req.body;
    const userId = getAuthorizedUserId(req);

    if (!userId) {
      return res.status(400).json({ error: "Category userId is required" });
    }

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check for duplicate category name for this user
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: name,
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Category with this name already exists for this user" });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        color: color || "#3B82F6",
        icon: icon || null,
        userId,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// UPDATE category
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (req.user?.role !== "ADMIN" && existingCategory.userId !== req.user?.userId) {
      return res.status(403).json({ error: "Forbidden: Cannot modify this category" });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(icon !== undefined && { icon }),
      },
    });

    res.json(category);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE category
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (req.user?.role !== "ADMIN" && existingCategory.userId !== req.user?.userId) {
      return res.status(403).json({ error: "Forbidden: Cannot delete this category" });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({ message: "Category deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Cannot delete category with expenses" });
    }
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
