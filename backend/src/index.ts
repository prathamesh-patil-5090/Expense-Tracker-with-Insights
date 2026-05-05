import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Import routes
import authRoutes from "./routes/auth.js";
import exportRoutes from "./routes/exports.js";
import userRoutes from "./routes/users.js";
import categoryRoutes from "./routes/categories.js";
import expenseRoutes from "./routes/expenses.js";

// Import middleware
import { authenticateToken, verifyResourceOwnership } from "./middleware/auth.js";

dotenv.config({ path: ".env.local" });

const app: Express = express();
const port = process.env.PORT || 5000;

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Response timing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(
      `[perf] ${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(2)}ms`
    );
  });

  next();
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Authentication routes (register, login, etc.)
app.use("/api/auth", authRoutes);
app.use("/api/exports", authenticateToken);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// Apply authentication middleware to all routes below this point
app.use("/api/users", authenticateToken);
app.use("/api/categories", authenticateToken, verifyResourceOwnership);
app.use("/api/expenses", authenticateToken, verifyResourceOwnership);

// API Routes
app.use("/api/exports", exportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/expenses", expenseRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    status: err.status || 500,
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  console.log(`📊 API Documentation available at http://localhost:${port}/api`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
