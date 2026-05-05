import { Router, Request, Response } from "express";
import { prisma } from "../index.js";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  validateEmail,
  sanitizeInput,
  generateResetToken,
  hashResetToken,
} from "../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpirationTime,
} from "../utils/jwt.js";
import { authenticateToken, rateLimitAuth } from "../middleware/auth.js";

const router = Router();

// ============================================================================
// REGISTRATION ENDPOINT
// ============================================================================

interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post("/register", rateLimitAuth, async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const { email, name, password, confirmPassword } = req.body;

    // Validation
    if (!email || !name || !password || !confirmPassword) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["email", "name", "password", "confirmPassword"],
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
        code: "INVALID_EMAIL",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match",
        code: "PASSWORD_MISMATCH",
      });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: "Password does not meet strength requirements",
        code: "WEAK_PASSWORD",
        requirements: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Email already registered",
        code: "EMAIL_EXISTS",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token (for future use)
    const emailVerificationToken = generateResetToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: sanitizeInput(name),
        passwordHash,
        emailVerificationToken,
        role: "USER",
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: "", // Will be set after session creation
    });

    // Create session
    const accessTokenExpiration = getTokenExpirationTime(process.env.JWT_EXPIRES_IN || "24h");
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + accessTokenExpiration),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    // Update refresh token with session ID
    const refreshTokenWithSession = generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken: refreshTokenWithSession,
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// ============================================================================
// LOGIN ENDPOINT
// ============================================================================

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/login
 * Authenticate user and return access/refresh tokens
 */
router.post("/login", rateLimitAuth, async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const accessTokenExpiration = getTokenExpirationTime(process.env.JWT_EXPIRES_IN || "24h");
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + accessTokenExpiration),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// ============================================================================
// LOGOUT ENDPOINT
// ============================================================================

/**
 * POST /api/auth/logout
 * Invalidate current session and token
 */
router.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Invalidate session
    await prisma.session.update({
      where: { token: req.token },
      data: { isActive: false },
    });

    // Update last logout time
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { lastLogoutAt: new Date() },
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

// ============================================================================
// REFRESH TOKEN ENDPOINT
// ============================================================================

interface RefreshRequest {
  refreshToken: string;
}

/**
 * POST /api/auth/refresh
 * Get a new access token using refresh token
 */
router.post("/refresh", async (req: Request<{}, {}, RefreshRequest>, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token is required",
        code: "MISSING_REFRESH_TOKEN",
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        error: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    // Verify session is still active
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session || !session.isActive) {
      return res.status(401).json({
        error: "Session is no longer active",
        code: "SESSION_EXPIRED",
      });
    }

    const user = session.user;

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Update session with new token
    const accessTokenExpiration = getTokenExpirationTime(process.env.JWT_EXPIRES_IN || "24h");
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        expiresAt: new Date(Date.now() + accessTokenExpiration),
      },
    });

    res.json({
      message: "Token refreshed successfully",
      tokens: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// ============================================================================
// REQUEST PASSWORD RESET ENDPOINT
// ============================================================================

interface ForgotPasswordRequest {
  email: string;
}

/**
 * POST /api/auth/forgot-password
 * Request password reset token
 */
router.post(
  "/forgot-password",
  rateLimitAuth,
  async (req: Request<{}, {}, ForgotPasswordRequest>, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: "Email is required",
          code: "MISSING_EMAIL",
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Always return success for security (don't reveal if email exists)
      if (!user) {
        return res.json({
          message: "If email exists, password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const resetTokenHash = hashResetToken(resetToken);

      // Set token expiration to 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Store reset token hash (not the token itself)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash,
          resetTokenExpires: expiresAt,
        },
      });

      // TODO: Send email with reset link
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      // await sendPasswordResetEmail(user.email, user.name, resetLink);

      console.log(
        `\n🔐 Password reset requested for ${user.email}\nReset token: ${resetToken}\nExpires: ${expiresAt.toISOString()}\n`
      );

      res.json({
        message: "If email exists, password reset link has been sent",
        // In development, return the token for testing
        ...(process.env.NODE_ENV === "development" && { resetToken }),
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  }
);

// ============================================================================
// RESET PASSWORD ENDPOINT
// ============================================================================

interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
router.post(
  "/reset-password",
  async (req: Request<{}, {}, ResetPasswordRequest>, res: Response) => {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token || !password || !confirmPassword) {
        return res.status(400).json({
          error: "Token, password, and confirmPassword are required",
          code: "MISSING_FIELDS",
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          error: "Passwords do not match",
          code: "PASSWORD_MISMATCH",
        });
      }

      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: "Password does not meet strength requirements",
          code: "WEAK_PASSWORD",
          requirements: passwordValidation.errors,
        });
      }

      // Hash the reset token to find the user
      const resetTokenHash = hashResetToken(token);

      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          resetTokenHash,
          resetTokenExpires: {
            gt: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        return res.status(400).json({
          error: "Invalid or expired reset token",
          code: "INVALID_RESET_TOKEN",
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(password);

      // Update user password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          resetTokenHash: null,
          resetTokenExpires: null,
        },
      });

      // Invalidate all active sessions
      await prisma.session.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      });

      res.json({
        message: "Password reset successfully",
        note: "Please login with your new password",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

// ============================================================================
// GET CURRENT USER ENDPOINT
// ============================================================================

/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 */
router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// ============================================================================
// CHANGE PASSWORD ENDPOINT
// ============================================================================

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post(
  "/change-password",
  authenticateToken,
  async (req: Request<{}, {}, ChangePasswordRequest>, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          error: "All password fields are required",
          code: "MISSING_FIELDS",
        });
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const passwordMatch = await comparePassword(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({
          error: "Current password is incorrect",
          code: "INVALID_PASSWORD",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          error: "New passwords do not match",
          code: "PASSWORD_MISMATCH",
        });
      }

      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: "New password does not meet strength requirements",
          code: "WEAK_PASSWORD",
          requirements: passwordValidation.errors,
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

export default router;
