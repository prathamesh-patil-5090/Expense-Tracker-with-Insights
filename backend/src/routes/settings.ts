import { Router, Request, Response } from "express";
import { prisma } from "../index.js";

const router = Router();

router.get("/budget", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        dailyBudgetLimit: true,
        monthlyBudgetLimit: true,
        budgetAlertsEnabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching budget settings:", error);
    res.status(500).json({ error: "Failed to fetch budget settings" });
  }
});

router.put("/budget", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { dailyBudgetLimit, monthlyBudgetLimit, budgetAlertsEnabled } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        dailyBudgetLimit: dailyBudgetLimit === null || dailyBudgetLimit === undefined ? null : Number(dailyBudgetLimit),
        monthlyBudgetLimit: monthlyBudgetLimit === null || monthlyBudgetLimit === undefined ? null : Number(monthlyBudgetLimit),
        budgetAlertsEnabled: budgetAlertsEnabled ?? true,
      },
      select: {
        dailyBudgetLimit: true,
        monthlyBudgetLimit: true,
        budgetAlertsEnabled: true,
      },
    });

    res.json({ message: "Budget settings updated", settings: updated });
  } catch (error) {
    console.error("Error updating budget settings:", error);
    res.status(500).json({ error: "Failed to update budget settings" });
  }
});

export default router;