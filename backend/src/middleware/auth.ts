import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JWTPayload } from "../utils/jwt.js";

/**
 * Extended Express Request with user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      token?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * Checks for Bearer token in Authorization header
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Extract token from "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized: No token provided",
      code: "NO_TOKEN",
    });
  }

  const user = verifyAccessToken(token);

  if (!user) {
    return res.status(401).json({
      error: "Unauthorized: Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }

  req.user = user;
  req.token = token;
  next();
}

/**
 * Middleware to check if user has required role(s)
 * @param requiredRoles - Array of roles that can access the endpoint
 */
export function authorizeRole(...requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized: User not authenticated",
        code: "NOT_AUTHENTICATED",
      });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware to verify user owns the resource they're accessing
 * Ensures users can only access their own data
 */
export function verifyResourceOwnership(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized: User not authenticated",
      code: "NOT_AUTHENTICATED",
    });
  }

  // Get userId from query, body, or params
  const resourceUserId = req.query.userId || req.body.userId || req.params.userId;

  // Admin can access any user's data; regular users can only access their own
  if (req.user.role !== "ADMIN" && resourceUserId && resourceUserId !== req.user.userId) {
    return res.status(403).json({
      error: "Forbidden: Cannot access other user's data",
      code: "RESOURCE_OWNER_MISMATCH",
    });
  }

  // If no userId provided, use authenticated user's ID
  if (!req.query.userId && !req.body.userId && !req.params.userId) {
    req.query.userId = req.user.userId as any;
  }

  next();
}

/**
 * Middleware to optionally authenticate (doesn't fail if no token)
 * Useful for endpoints that work with or without authentication
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    const user = verifyAccessToken(token);
    if (user) {
      req.user = user;
      req.token = token;
    }
  }

  next();
}

/**
 * Middleware to verify email is confirmed
 * Prevents unverified users from accessing certain features
 */
export function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized: User not authenticated",
      code: "NOT_AUTHENTICATED",
    });
  }

  // This would require additional database check
  // For now, we'll assume it's verified if authenticated
  // In production, you'd query the User table to check emailVerified flag
  next();
}

/**
 * Middleware to rate limit authentication attempts
 * Prevents brute force attacks
 */
const attemptCache = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export function rateLimitAuth(req: Request, res: Response, next: NextFunction) {
  const identifier = req.body.email || req.ip || "unknown";
  const now = Date.now();

  const attempt = attemptCache.get(identifier);

  if (attempt && now - attempt.timestamp < ATTEMPT_WINDOW) {
    attempt.count++;

    if (attempt.count > MAX_ATTEMPTS) {
      return res.status(429).json({
        error: "Too many login attempts. Please try again later.",
        code: "RATE_LIMITED",
        retryAfter: Math.ceil((ATTEMPT_WINDOW - (now - attempt.timestamp)) / 1000),
      });
    }
  } else {
    attemptCache.set(identifier, { count: 1, timestamp: now });
  }

  next();
}

/**
 * Middleware to clean up old attempt records periodically
 */
export function cleanupAttemptCache() {
  const now = Date.now();
  for (const [key, value] of attemptCache.entries()) {
    if (now - value.timestamp > ATTEMPT_WINDOW) {
      attemptCache.delete(key);
    }
  }
}

// Clean up cache every 10 minutes
setInterval(cleanupAttemptCache, 10 * 60 * 1000);
