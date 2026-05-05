import jwt, { Secret } from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET: Secret = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Generate access token (short-lived JWT)
 * Used for API authentication
 */
export function generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  } as any);
}

/**
 * Generate refresh token (long-lived JWT)
 * Used to obtain new access tokens
 */
export function generateRefreshToken(payload: Omit<RefreshTokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    algorithm: "HS256",
  } as any);
}

/**
 * Verify access token
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    }) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode token without verification
 * Used to inspect token contents
 */
export function decodeToken(token: string): JWTPayload | RefreshTokenPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | RefreshTokenPayload | null;
  } catch (error) {
    return null;
  }
}

/**
 * Get token expiration time in milliseconds from now
 */
export function getTokenExpirationTime(expiresIn: string): number {
  const units: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
  };

  const match = expiresIn.match(/^(\d+)([a-z]+)$/);
  if (!match) return 0;

  const [, value, unit] = match;
  return parseInt(value) * (units[unit] || 0);
}
