import { Router, Request, Response } from "express";
import { prisma } from "../index.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const alerts = await prisma.alert.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ data: alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const alert = await prisma.alert.updateMany({
      where: { id: req.params.id, userId: req.user.userId },
      data: { readAt: new Date(), status: "READ" },
    });

    if (alert.count === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json({ message: "Alert marked as read" });
  } catch (error) {
    console.error("Error updating alert:", error);
    res.status(500).json({ error: "Failed to update alert" });
  }
});

export default router;
