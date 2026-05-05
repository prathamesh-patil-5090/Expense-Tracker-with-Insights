import crypto from "crypto";
import PDFDocument from "pdfkit";
import Handlebars from "handlebars";
import { Router, Request, Response } from "express";
import { prisma } from "../index.js";

type ExportFormat = "csv" | "json" | "pdf";
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

function reportFileName(userEmail: string, format: ExportFormat) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `expense-report-${userEmail}-${dateStamp}.${format}`;
}

function formatPeriodLabel(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return `${startDate} through ${endDate}`;
  }
  if (startDate) {
    return `Since ${startDate}`;
  }
  if (endDate) {
    return `Through ${endDate}`;
  }
  return "All time";
}

Handlebars.registerHelper("csvValue", (value: unknown) => escapeCsv(value));

function buildReportCsv(report: any) {
  const template = Handlebars.compile(`"Report Title","Expense Summary"
"Period","{{periodLabel}}"
"User","{{user.name}}"
"Email","{{user.email}}"
"Total expenses","{{summary.totalExpenses}}"
"Total spend","{{summary.totalAmount}}"
"Average expense","{{summary.avgAmount}}"

"Category Breakdown"
"Category","Count","Total","Average"
{{#each categoryBreakdown}}
"{{csvValue name}}","{{count}}","{{csvValue total}}","{{csvValue average}}"
{{/each}}

"Daily Trend"
"Date","Total"
{{#each trends}}
"{{csvValue date}}","{{csvValue total}}"
{{/each}}

"Recent Expenses"
"Date","Category","Description","Amount","Notes"
{{#each recentExpenses}}
"{{csvValue date}}","{{csvValue category}}","{{csvValue description}}","{{csvValue amount}}","{{csvValue notes}}"
{{/each}}`);

  return template(report);
}

function drawBarChart(doc: PDFKit.PDFDocument, items: Array<{ name: string; total: number; color: string }>, x: number, y: number, width: number, height: number) {
  const maxValue = Math.max(...items.map((item) => item.total), 1);
  const columnWidth = width / Math.max(items.length, 1);
  const barWidth = Math.min(40, columnWidth * 0.75);

  items.forEach((item, index) => {
    const barHeight = (item.total / maxValue) * (height - 20);
    const barX = x + index * columnWidth + (columnWidth - barWidth) / 2;
    const barY = y + height - barHeight;

    doc.rect(barX, barY, barWidth, barHeight).fill(item.color || "#0f766e");
    doc.fillColor("black").fontSize(8).text(item.name, x + index * columnWidth, y + height + 4, {
      width: columnWidth,
      align: "center",
      ellipsis: true,
    });
  });
}

function drawTrendChart(doc: PDFKit.PDFDocument, points: Array<{ date: string; total: number }>, x: number, y: number, width: number, height: number) {
  const maxValue = Math.max(...points.map((point) => point.total), 1);
  const pointSpacing = points.length > 1 ? width / (points.length - 1) : width;

  doc.save().strokeColor("#2563eb").lineWidth(2);
  points.forEach((point, index) => {
    const pointX = x + index * pointSpacing;
    const pointY = y + height - (point.total / maxValue) * (height - 20);

    if (index === 0) {
      doc.moveTo(pointX, pointY);
    } else {
      doc.lineTo(pointX, pointY);
    }
  });
  doc.stroke();

  doc.fillColor("#2563eb");
  points.forEach((point, index) => {
    const pointX = x + index * pointSpacing;
    const pointY = y + height - (point.total / maxValue) * (height - 20);
    doc.circle(pointX, pointY, 3).fill();
  });

  doc.fillColor("black").fontSize(8);
  points.forEach((point, index) => {
    const pointX = x + index * pointSpacing;
    doc.text(point.date, pointX - 20, y + height + 4, {
      width: 40,
      align: "center",
      ellipsis: true,
    });
  });
  doc.restore();
}

function streamPdfReport(res: Response, report: any, filename: string) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");

  doc.fontSize(20).text("Expense Summary Report", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
  doc.text(`User: ${report.user.name} <${report.user.email}>`);
  doc.text(`Period: ${report.periodLabel}`);
  doc.moveDown();

  doc.fontSize(12).text("Summary", { underline: true });
  doc.moveDown(0.2);
  doc.fontSize(10).text(`Total expenses: ${report.summary.totalExpenses}`);
  doc.text(`Total spend: $${report.summary.totalAmount.toFixed(2)}`);
  doc.text(`Average expense: $${report.summary.avgAmount.toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(12).text("Category Breakdown", { underline: true });
  doc.moveDown(0.2);
  const chartY = doc.y;
  drawBarChart(doc, report.categoryBreakdown.slice(0, 8), 50, chartY, 500, 120);
  doc.moveDown(8);

  doc.fontSize(12).text("Trend Graph", { underline: true });
  doc.moveDown(0.2);
  drawTrendChart(doc, report.trends.slice(-10), 50, doc.y, 500, 120);
  doc.moveDown(8);

  doc.fontSize(12).text("Recent Expenses", { underline: true });
  doc.moveDown(0.2);
  doc.fontSize(10);
  report.recentExpenses.forEach((expense: any) => {
    doc.text(
      `${expense.date} • ${expense.category} • ${expense.description} • $${expense.amount.toFixed(2)}${expense.notes ? ` • ${expense.notes}` : ""}`,
      {
        paragraphGap: 2,
      }
    );
  });

  doc.pipe(res);
  doc.end();
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