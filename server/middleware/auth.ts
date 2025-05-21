import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';
import { storage } from '../storage';
import { User } from '@shared/schema';

/**
 * Express Request with User
 * Extends the Express Request type to include the user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

/**
 * Extract the JWT token from the request
 * @param req Request object
 * @returns JWT token or null if not found
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // Check for token in cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check for token in query parameters
  if (req.query && req.query.token) {
    return req.query.token as string;
  }
  
  return null;
}

/**
 * Middleware to authenticate users via JWT
 * Sets req.user and req.token if authentication is successful
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from request
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const payload = verifyToken(token, 'access');
    
    if (!payload || !payload.userId) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Get user from database
    const user = await storage.getUser(payload.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Set user and token on request
    req.user = user;
    req.token = token;
    
    // Check if user belongs to organization and set organization data
    if (user.organizationId) {
      // For multi-tenant applications, we can attach organization data here
      // This ensures data segregation by enforcing organization context
      const organization = await storage.getOrganization(user.organizationId);
      if (!organization) {
        console.warn(`User ${user.id} has invalid organization ID: ${user.organizationId}`);
      }
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

/**
 * Middleware to check if a user has the required role
 * @param requiredRole Role required to access the resource
 */
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userRole = req.user.role || 'user';
    
    // Check if user has the required role
    // Special case: 'admin' role has access to everything
    if (userRole === 'admin' || userRole === requiredRole) {
      return next();
    }
    
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};

/**
 * Middleware to enforce data segregation at organization level
 * Ensures that users can only access data that belongs to their organization
 */
export const enforceOrganizationSegregation = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Organization ID from token
    const userOrgId = req.user.organizationId;
    
    // Extract organization ID from request parameters
    const paramOrgId = req.params.organizationId;
    
    // If there's an organization ID in the parameters, ensure it matches the user's organization
    if (paramOrgId && userOrgId && paramOrgId !== userOrgId) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to access this organization\'s data'
      });
    }
    
    next();
  };
};

/**
 * Middleware to enforce data segregation at user level
 * Ensures that users can only access their own data
 */
export const enforceUserSegregation = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // User ID from token
    const tokenUserId = req.user.id;
    
    // Extract user ID from request parameters
    const paramUserId = req.params.userId;
    
    // If there's a user ID in the parameters, ensure it matches the authenticated user's ID
    if (paramUserId && paramUserId !== tokenUserId) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to access another user\'s data'
      });
    }
    
    next();
  };
};