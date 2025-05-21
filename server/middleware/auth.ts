import { Request, Response, NextFunction } from "express";
import { extractUserFromToken } from "../utils/jwt";
import { storage } from "../storage";

/**
 * Authentication middleware to check if user is authenticated
 * This can be applied to any routes that require authentication
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const tokenData = extractUserFromToken(authHeader);
    
    if (!tokenData) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Add user data to request
    req.user = {
      id: tokenData.userId,
      email: tokenData.email,
      role: tokenData.role,
      organizationId: tokenData.organizationId
    };
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

/**
 * Middleware to enforce row-level security
 * This prevents users from accessing data that doesn't belong to them
 * or their organization
 */
export const enforceRowLevelSecurity = (resourceIdParam: string = 'id', userIdField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip for admins
      if (req.user?.role === 'admin') {
        return next();
      }
      
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return next();
      }
      
      // For collection resources that have a userId field
      const userResources = ['platforms', 'conversations', 'messages', 'knowledgeBase', 'analytics'];
      const resourceType = req.originalUrl.split('/')[2];
      
      if (userResources.includes(resourceType)) {
        const resource = await getResourceById(resourceType, resourceId);
        
        if (!resource) {
          return res.status(404).json({ error: "Resource not found" });
        }
        
        // Check if resource belongs to user or user's organization
        if (resource[userIdField] !== req.user?.id && 
            (!req.user?.organizationId || !resource.organizationId || 
             resource.organizationId !== req.user?.organizationId)) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      
      next();
    } catch (error) {
      console.error("Row-level security error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to check if user has required role
 * @param roles Array of allowed roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      next();
    } catch (error) {
      console.error("Role check error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to enforce organization-level access
 * This prevents users from accessing other organizations' data
 */
export const enforceOrganizationAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip for admins
    if (req.user?.role === 'admin') {
      return next();
    }
    
    const organizationId = req.params.organizationId || req.query.organizationId;
    
    if (!organizationId || typeof organizationId !== 'string') {
      return next();
    }
    
    // Check if user belongs to the organization
    if (req.user?.organizationId !== organizationId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  } catch (error) {
    console.error("Organization access error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to get a resource by ID
async function getResourceById(resourceType: string, id: string | number): Promise<any> {
  switch (resourceType) {
    case 'platforms':
      return storage.getPlatformById(Number(id));
    case 'conversations':
      return storage.getConversationById(Number(id));
    case 'knowledgeBase':
      return storage.getKnowledgeBaseById(Number(id));
    default:
      return null;
  }
}

// Extend the Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId?: string;
      };
    }
  }
}