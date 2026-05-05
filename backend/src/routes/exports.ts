import crypto from "crypto";
import { Router, Request, Response } from "express";
import { prisma } from "../index.js";

type ExportFormat = "csv" | "json";
type ExportSort = "date" | "amount" | "oldest";

interface ExportQuery {
  userId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: ExportSort;
  format?: ExportFormat;
}

const router = Router();

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function buildWhere(query: ExportQuery) {
  const where: Record<string, unknown> = {
    userId: query.userId,
  };

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  const dateFilter: Record<string, Date> = {};
  const startDate = parseDate(query.startDate);
  const endDate = parseDate(query.endDate);

  if (startDate) {
    dateFilter.gte = startDate;
  }

  if (endDate) {
    dateFilter.lte = endDate;
  }

  if (Object.keys(dateFilter).length > 0) {
    where.date = dateFilter;
  }

  return where;
}

function buildOrderBy(sortBy: ExportSort | undefined) {
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

function fileNameFor(userEmail: string, format: ExportFormat) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `expenses-${userEmail}-${dateStamp}.${format}`;
}

async function getFilteredUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
}

router.get("/expenses", async (req: Request<{}, {}, {}, ExportQuery>, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const format = ((req.query.format || "csv") as string).toLowerCase() as ExportFormat;
    if (format !== "csv" && format !== "json") {
      return res.status(400).json({ error: "format must be csv or json" });
    }

    const requestedUserId = req.query.userId || req.user.userId;
    if (req.user.role !== "ADMIN" && requestedUserId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: Cannot export other user's data" });
    }

    const user = await getFilteredUser(requestedUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const where = buildWhere({ ...req.query, userId: requestedUserId });
    const orderBy = buildOrderBy(req.query.sortBy);
    const batchSize = 500;
    let cursor: string | undefined;
    let totalRecords = 0;
    let bytesWritten = 0;
    const checksum = crypto.createHash("sha256");

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Trailer", "X-Export-Checksum, X-Export-Records, X-Export-Bytes, X-Export-Valid");
    res.setHeader("X-Export-Format", format);

    if (format === "csv") {
      const filename = fileNameFor(user.email, format);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const header = [
        "id",
        "date",
        "description",
        "amount",
        "categoryId",
        "categoryName",
        "notes",
        "receipt",
        "userId",
        "userName",
        "userEmail",
        "createdAt",
        "updatedAt",
      ].join(",") + "\n";

      checksum.update(header);
      bytesWritten += Buffer.byteLength(header);
      res.write(header);

      while (true) {
        const batch = await prisma.expense.findMany({
          where: where as any,
          orderBy,
          take: batchSize,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            category: {
              select: { id: true, name: true, color: true },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        if (batch.length === 0) {
          break;
        }

        for (const expense of batch) {
          const row = [
            expense.id,
            expense.date.toISOString(),
            expense.description,
            expense.amount,
            expense.categoryId,
            expense.category?.name || "",
            expense.notes || "",
            expense.receipt || "",
            expense.userId,
            expense.user?.name || "",
            expense.user?.email || "",
            expense.createdAt.toISOString(),
            expense.updatedAt.toISOString(),
          ]
            .map(escapeCsv)
            .join(",") + "\n";

          checksum.update(row);
          bytesWritten += Buffer.byteLength(row);
          totalRecords += 1;
          res.write(row);
        }

        if (batch.length < batchSize) {
          break;
        }

        cursor = batch[batch.length - 1].id;
      }
    } else {
      const filename = fileNameFor(user.email, format);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const prefix = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          format,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          filters: {
            userId: requestedUserId,
            categoryId: req.query.categoryId || null,
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null,
            sortBy: req.query.sortBy || "date",
          },
        },
        data: [],
      });

      const prefixEnd = prefix.indexOf("[]");
      const start = prefix.slice(0, prefixEnd + 1);
      const end = prefix.slice(prefixEnd + 1);

      checksum.update(start);
      bytesWritten += Buffer.byteLength(start);
      res.write(start);

      let firstItem = true;

      while (true) {
        const batch = await prisma.expense.findMany({
          where: where as any,
          orderBy,
          take: batchSize,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            category: {
              select: { id: true, name: true, color: true },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        if (batch.length === 0) {
          break;
        }

        for (const expense of batch) {
          const serialized = JSON.stringify({
            id: expense.id,
            date: expense.date,
            description: expense.description,
            amount: expense.amount,
            categoryId: expense.categoryId,
            category: expense.category,
            notes: expense.notes,
            receipt: expense.receipt,
            userId: expense.userId,
            user: expense.user,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
          });

          const chunk = `${firstItem ? "" : ","}${serialized}`;
          firstItem = false;
          checksum.update(chunk);
          bytesWritten += Buffer.byteLength(chunk);
          totalRecords += 1;
          res.write(chunk);
        }

        if (batch.length < batchSize) {
          break;
        }

        cursor = batch[batch.length - 1].id;
      }

      checksum.update(end);
      bytesWritten += Buffer.byteLength(end);
      res.write(end);
    }

    const validation = totalRecords >= 0 && bytesWritten > 0;
    res.addTrailers({
      "X-Export-Checksum": checksum.digest("hex"),
      "X-Export-Records": String(totalRecords),
      "X-Export-Bytes": String(bytesWritten),
      "X-Export-Valid": String(validation),
    });

    return res.end();
  } catch (error) {
    console.error("Export error:", error);
    return res.status(500).json({ error: "Failed to export expenses" });
  }
});

export default router;