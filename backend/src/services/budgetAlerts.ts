import { prisma } from "../index.js";
import { sendMail } from "../utils/email.js";

export type BudgetAlertType = "DAILY" | "MONTHLY";

export type BudgetAlertResult = {
  triggered: boolean;
  alertType: BudgetAlertType;
  spendTotal: number;
  threshold: number;
  dedupeKey: string;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

async function createAlertIfNeeded(params: {
  userId: string;
  type: BudgetAlertType;
  periodStart: Date;
  periodEnd: Date;
  threshold: number;
  spendTotal: number;
  email: string;
  name: string;
}) {
  const dedupeKey = `${params.userId}:${params.type}:${params.periodStart.toISOString().slice(0, 10)}`;

  const existing = await prisma.alert.findUnique({
    where: { dedupeKey },
  });

  if (existing) {
    return {
      triggered: false,
      alertType: params.type,
      spendTotal: params.spendTotal,
      threshold: params.threshold,
      dedupeKey,
    } satisfies BudgetAlertResult;
  }

  const alert = await prisma.alert.create({
    data: {
      userId: params.userId,
      type: params.type,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      threshold: params.threshold,
      spendTotal: params.spendTotal,
      dedupeKey,
      message: `${params.type === "DAILY" ? "Daily" : "Monthly"} spending limit exceeded`,
    },
  });

  await sendMail({
    to: params.email,
    subject: `Expense Alert: ${params.type} budget exceeded`,
    text: `Hi ${params.name},\n\nYour ${params.type.toLowerCase()} spending of $${params.spendTotal.toFixed(2)} exceeded your limit of $${params.threshold.toFixed(2)}.\n\nOpen the dashboard to review your recent expenses.`,
    html: `<p>Hi ${params.name},</p><p>Your <strong>${params.type.toLowerCase()}</strong> spending of <strong>$${params.spendTotal.toFixed(2)}</strong> exceeded your limit of <strong>$${params.threshold.toFixed(2)}</strong>.</p><p>Open the dashboard to review your recent expenses.</p>`,
  });

  await prisma.alert.update({
    where: { id: alert.id },
    data: {
      sentAt: new Date(),
      status: "SENT",
    },
  });

  return {
    triggered: true,
    alertType: params.type,
    spendTotal: params.spendTotal,
    threshold: params.threshold,
    dedupeKey,
  } satisfies BudgetAlertResult;
}

export async function evaluateBudgetAlerts(userId: string, referenceDate = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      dailyBudgetLimit: true,
      monthlyBudgetLimit: true,
      budgetAlertsEnabled: true,
    },
  });

  if (!user || !user.budgetAlertsEnabled) {
    return [] as BudgetAlertResult[];
  }

  const results: BudgetAlertResult[] = [];

  const dailyStart = startOfDay(referenceDate);
  const dailyEnd = new Date(dailyStart);
  dailyEnd.setDate(dailyEnd.getDate() + 1);

  if (typeof user.dailyBudgetLimit === "number") {
    const dailySpend = await prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: dailyStart,
          lt: dailyEnd,
        },
      },
      _sum: { amount: true },
    });

    const dailyTotal = dailySpend._sum.amount || 0;
    if (dailyTotal > user.dailyBudgetLimit) {
      results.push(
        await createAlertIfNeeded({
          userId,
          type: "DAILY",
          periodStart: dailyStart,
          periodEnd: dailyEnd,
          threshold: user.dailyBudgetLimit,
          spendTotal: dailyTotal,
          email: user.email,
          name: user.name,
        })
      );
    }
  }

  const monthlyStart = startOfMonth(referenceDate);
  const monthlyEnd = new Date(monthlyStart);
  monthlyEnd.setMonth(monthlyEnd.getMonth() + 1);

  if (typeof user.monthlyBudgetLimit === "number") {
    const monthlySpend = await prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: monthlyStart,
          lt: monthlyEnd,
        },
      },
      _sum: { amount: true },
    });

    const monthlyTotal = monthlySpend._sum.amount || 0;
    if (monthlyTotal > user.monthlyBudgetLimit) {
      results.push(
        await createAlertIfNeeded({
          userId,
          type: "MONTHLY",
          periodStart: monthlyStart,
          periodEnd: monthlyEnd,
          threshold: user.monthlyBudgetLimit,
          spendTotal: monthlyTotal,
          email: user.email,
          name: user.name,
        })
      );
    }
  }

  return results.filter((result) => result.triggered);
}
