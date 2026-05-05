import { Router, Request, Response } from "express";
import { prisma } from "../index.js";

const router = Router();

// GET all expenses for a user with optional filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId, categoryId, startDate, endDate, sortBy = "date" } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const where: any = {
      userId: userId as string,
    };

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const orderBy: any = {};
    switch (sortBy) {
      case "amount":
        orderBy.amount = "desc";
        break;
      case "oldest":
        orderBy.date = "asc";
        break;
      case "date":
      default:
        orderBy.date = "desc";
        break;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy,
    });

    // Calculate statistics
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgAmount = expenses.length > 0 ? totalAmount / expenses.length : 0;

    res.json({
      data: expenses,
      stats: {
        total: expenses.length,
        totalAmount,
        avgAmount,
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// GET single expense by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

// CREATE new expense
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, categoryId, amount, description, date, receipt, notes } = req.body;

    // Validation
    if (!userId || !categoryId || !amount || !description) {
      return res.status(400).json({
        error: "userId, categoryId, amount, and description are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found for this user" });
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        categoryId,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        receipt: receipt || null,
        notes: notes || null,
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// UPDATE expense
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, amount, description, date, receipt, notes } = req.body;

    // If changing category, verify it belongs to the expense's user
    if (categoryId) {
      const expense = await prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: expense.userId,
        },
      });

      if (!category) {
        return res.status(404).json({ error: "Category not found for this user" });
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(receipt !== undefined && { receipt }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(expense);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Expense not found" });
    }
    console.error("Error updating expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// DELETE expense
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.expense.delete({
      where: { id },
    });

    res.json({ message: "Expense deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Expense not found" });
    }
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// GET expense summary/statistics for a user
router.get("/stats/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    // Get all expenses
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
      },
    });

    // Group by category
    const byCategory = expenses.reduce(
      (acc, expense) => {
        const catName = expense.category.name;
        if (!acc[catName]) {
          acc[catName] = {
            categoryId: expense.categoryId,
            count: 0,
            total: 0,
            average: 0,
            color: expense.category.color,
          };
        }
        acc[catName].count += 1;
        acc[catName].total += expense.amount;
        acc[catName].average = acc[catName].total / acc[catName].count;
        return acc;
      },
      {} as Record<string, any>
    );

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      user: {
        id: user.id,
        name: user.name,
      },
      summary: {
        totalExpenses: expenses.length,
        totalAmount,
        avgAmount: expenses.length > 0 ? totalAmount / expenses.length : 0,
        byCategory,
      },
      period: {
        startDate: startDate || "all-time",
        endDate: endDate || "today",
      },
    });
  } catch (error) {
    console.error("Error fetching expense statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;
