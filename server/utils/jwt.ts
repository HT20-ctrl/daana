import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

// Secret keys for token signing
const accessTokenSecret = process.env.SESSION_SECRET || 'UNSAFE_DEVELOPMENT_SECRET';
const refreshTokenSecret = accessTokenSecret + '_refresh';
const verificationTokenSecret = accessTokenSecret + '_verification';
const passwordResetTokenSecret = accessTokenSecret + '_reset';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 days
const VERIFICATION_TOKEN_EXPIRY = '3d';  // 3 days
const PASSWORD_RESET_TOKEN_EXPIRY = '1h';  // 1 hour

// Token payload interface
export interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
  organizationId?: string;
}

/**
 * Generate an access token for authenticated requests
 * @param payload User data to include in the token
 * @returns Signed JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, accessTokenSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a refresh token for obtaining new access tokens
 * @param payload User data to include in the token
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, refreshTokenSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Generate an email verification token
 * @param userId User ID to include in the token
 * @returns Signed JWT verification token
 */
export function generateVerificationToken(userId: string): string {
  return jwt.sign({ userId, tokenId: nanoid(8) }, verificationTokenSecret, {
    expiresIn: VERIFICATION_TOKEN_EXPIRY,
  });
}

/**
 * Generate a password reset token
 * @param userId User ID to include in the token
 * @returns Signed JWT password reset token
 */
export function generatePasswordResetToken(userId: string): string {
  return jwt.sign({ userId, tokenId: nanoid(8) }, passwordResetTokenSecret, {
    expiresIn: PASSWORD_RESET_TOKEN_EXPIRY,
  });
}

/**
 * Verify a token and extract its payload
 * @param token JWT token to verify
 * @param type Type of token (access, refresh, verification, reset)
 * @returns Token payload if valid, null otherwise
 */
export function verifyToken(
  token: string,
  type: 'access' | 'refresh' | 'verification' | 'reset'
): any {
  try {
    let secret;
    
    switch (type) {
      case 'access':
        secret = accessTokenSecret;
        break;
      case 'refresh':
        secret = refreshTokenSecret;
        break;
      case 'verification':
        secret = verificationTokenSecret;
        break;
      case 'reset':
        secret = passwordResetTokenSecret;
        break;
      default:
        return null;
    }
    
    return jwt.verify(token, secret);
  } catch (error) {
    console.error(`Token verification error (${type}):`, error);
    return null;
  }
}

/**
 * Decode a token without verification (useful for debugging)
 * @param token JWT token to decode
 * @returns Decoded token payload
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}