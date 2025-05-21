import jwt from 'jsonwebtoken';

// JWT secret from environment variables
const JWT_SECRET = process.env.SESSION_SECRET || 'replace-this-with-a-real-secret';
const JWT_EXPIRY = '24h'; // Token expires in 24 hours

interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  organizationId?: string;
}

// Generate a JWT token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify a JWT token
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Extract user info from authorization header
export function extractUserFromToken(authHeader?: string): TokenPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}