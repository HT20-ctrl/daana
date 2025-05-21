/**
 * JWT Utility Functions
 * 
 * Handles token generation and verification for authentication
 */
import jwt from 'jsonwebtoken';

// Secret key for signing tokens - use SESSION_SECRET env var
const JWT_SECRET = process.env.SESSION_SECRET || 'default-jwt-secret';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 days

/**
 * Generate a JWT access token for authenticated users
 * @param userId User ID to encode in the token
 * @param organizationId Organization ID to encode in the token
 * @returns The signed JWT access token
 */
export function generateAccessToken(userId: string, organizationId: string | null = null) {
  return jwt.sign(
    { 
      userId,
      organizationId,
      type: 'access' 
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a refresh token with longer expiration
 * @param userId User ID to encode in the token
 * @returns The signed JWT refresh token
 */
export function generateRefreshToken(userId: string) {
  return jwt.sign(
    { 
      userId,
      type: 'refresh' 
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify a JWT token and return its payload
 * @param token The token to verify
 * @returns The decoded token payload or null if invalid
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Generate email verification token
 * @param userId User ID to encode in token
 * @param email Email address to verify
 * @returns The signed verification token
 */
export function generateVerificationToken(userId: string, email: string) {
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'verification' 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Generate password reset token
 * @param userId User ID for reset
 * @param email Email address for reset
 * @returns The signed reset token
 */
export function generateResetToken(userId: string, email: string) {
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'reset' 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}