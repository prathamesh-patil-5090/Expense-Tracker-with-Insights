import { Router, Request, Response } from "express";
import { prisma } from "../index.js";
import { evaluateBudgetAlerts } from "../services/budgetAlerts.js";

const router = Router();

const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 1000;

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}

function buildExpenseWhere(params: {
  userId: string;
  categoryId?: unknown;
  startDate?: unknown;
  endDate?: unknown;
}) {
  const where: any = {
    userId: params.userId,
  };

  if (params.categoryId) {
    where.categoryId = params.categoryId as string;
  }

  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) {
      where.date.gte = new Date(params.startDate as string);
    }
    if (params.endDate) {
      where.date.lte = new Date(params.endDate as string);
    }
  }

  return where;
}

function buildOrderBy(sortBy: unknown) {
  switch (sortBy) {
    case "amount":
      return [{ amount: "desc" as const }, { id: "asc" as const }];
    case "oldest":
      return [{ date: "asc" as const }, { id: "asc" as const }];
    case "date":
    default:
      return [{ date: "desc" as const }, { id: "asc" as const }];
  }
}

function expenseSelect() {
  return {
    id: true,
    userId: true,
    amount: true,
    description: true,
    date: true,
    receipt: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    categoryId: true,
    category: {
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
}

// GET all expenses for a user with optional filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      categoryId,
      startDate,
      endDate,
      sortBy = "date",
      limit,
      offset,
    } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const pageSize = parsePositiveInteger(limit, DEFAULT_PAGE_SIZE);
    const pageOffset = Number.isFinite(Number(offset)) && Number(offset) > 0 ? Math.floor(Number(offset)) : 0;

    const where = buildExpenseWhere({
      userId: userId as string,
      categoryId,
      startDate,
      endDate,
    });

    const [expenses, totalCount, totals] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: buildOrderBy(sortBy),
        select: expenseSelect(),
        take: pageSize,
        skip: pageOffset,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
    ]);

    const totalAmount = totals._sum.amount || 0;
    const avgAmount = totals._avg.amount || 0;

    res.json({
      data: expenses,
      stats: {
        total: totalCount,
        totalAmount,
        avgAmount,
      },
      pageInfo: {
        limit: pageSize,
        offset: pageOffset,
        returned: expenses.length,
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// GET expense summary/statistics for a user
router.get("/stats/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const where = buildExpenseWhere({
      userId,
      startDate,
      endDate,
    });

    const [summary, byCategory] = await Promise.all([
      prisma.expense.aggregate({
        where,
        _count: { id: true },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: byCategory.map((group) => group.categoryId),
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    const categoryLookup = new Map(categories.map((category) => [category.id, category]));
    const groupedByCategory = byCategory.reduce((acc, group) => {
      const category = categoryLookup.get(group.categoryId);
      if (!category) {
        return acc;
      }

      acc[category.name] = {
        categoryId: group.categoryId,
        count: group._count.id,
        total: group._sum.amount || 0,
        average: group._count.id > 0 ? (group._sum.amount || 0) / group._count.id : 0,
        color: category.color,
      };
      return acc;
    }, {} as Record<string, any>);

    const totalAmount = summary._sum.amount || 0;

    res.json({
      user,
      summary: {
        totalExpenses: summary._count.id,
        totalAmount,
        avgAmount: summary._avg.amount || 0,
        byCategory: groupedByCategory,
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

// GET single expense by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: expenseSelect(),
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
      select: expenseSelect(),
    });

    await evaluateBudgetAlerts(userId, expense.date);

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
      select: expenseSelect(),
    });

    await evaluateBudgetAlerts(expense.userId, expense.date);

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

    const expense = await prisma.expense.findUnique({
      where: { id },
      select: {
        userId: true,
        date: true,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    await prisma.expense.delete({
      where: { id },
    });

    await evaluateBudgetAlerts(expense.userId, expense.date);

    res.json({ message: "Expense deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Expense not found" });
    }
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
