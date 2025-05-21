/**
 * Authentication Middleware
 * 
 * Handles JWT verification and enforces row-level security
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, organizationMembers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../utils/jwt';

// Interface for authenticated request with user information
export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
  organizationId?: string;
}

/**
 * Middleware to verify JWT access token
 * Attaches user and organization info to the request
 */
export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // For Replit Auth, check if user is authenticated through session
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user as any;
    
    // Extract user info from session
    req.userId = user.claims?.sub;
    req.organizationId = req.session?.organizationId || null;
    
    // Pass control to next middleware
    return next();
  }
  
  // Traditional JWT auth as fallback
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Verify the token
  const payload = verifyToken(token);
  
  if (!payload || payload.type !== 'access') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  try {
    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId));
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }
    
    // Attach user info to request
    req.user = user;
    req.userId = user.id;
    req.organizationId = payload.organizationId || user.organizationId;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed due to server error'
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param allowedRoles Array of roles that are allowed to access the resource
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Get user's role in the organization
    try {
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, req.userId!),
            eq(organizationMembers.organizationId, req.organizationId!)
          )
        );

      if (!membership || !allowedRoles.includes(membership.role || 'member')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Role check failed due to server error'
      });
    }
  };
};

/**
 * Middleware to enforce strict organization-level data access
 * Ensures users can only access data within their organization
 */
export const enforceOrganizationAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.organizationId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  try {
    // Check if user belongs to the organization
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, req.userId!),
          eq(organizationMembers.organizationId, req.organizationId)
        )
      );

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this organization\'s data'
      });
    }

    next();
  } catch (error) {
    console.error('Organization access check error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Organization access check failed'
    });
  }
};

/**
 * Middleware to restrict access to resource owner only
 * @param resourceField Field name on the request parameters that contains the resource ID
 * @param getOwnerId Function to retrieve the owner ID for the specified resource
 */
export const restrictToOwnerOnly = (
  resourceField: string,
  getOwnerId: (resourceId: string | number) => Promise<string>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const resourceId = req.params[resourceField];
    
    if (!resourceId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Resource ID (${resourceField}) is required`
      });
    }

    try {
      // Get the owner ID of the resource
      const ownerId = await getOwnerId(resourceId);
      
      // Check if the current user is the owner
      if (ownerId !== req.userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Owner check error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Owner check failed due to server error'
      });
    }
  };
};