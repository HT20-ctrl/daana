import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { User } from '@shared/schema';

/**
 * Authentication middleware to check if user is authenticated
 * This can be applied to any routes that require authentication
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.SESSION_SECRET!) as jwt.JwtPayload;
    
    if (!decoded.userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
    
    // Get user from database
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }
    
    // Store user in request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
    
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
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
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: Authentication required" });
      }
      
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({ message: "Bad request: Resource ID is required" });
      }
      
      // Get the resource from the database
      // The resource type is determined based on the route
      const resource = await getResourceById(req.path.split('/')[2], resourceId);
      
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      
      // Check if the resource belongs to the user or their organization
      if (resource[userIdField] === req.user.id) {
        // Resource belongs to the user directly
        next();
      } else if (req.user.organizationId && resource.organizationId === req.user.organizationId) {
        // Resource belongs to the user's organization
        next();
      } else {
        // User doesn't have access to this resource
        return res.status(403).json({ message: "Forbidden: You don't have access to this resource" });
      }
    } catch (error) {
      console.error("Row-level security error:", error);
      return res.status(500).json({ message: "Internal server error during access control check" });
    }
  };
};

/**
 * Middleware to check if user has required role
 * @param roles Array of allowed roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    
    const userRole = req.user.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Forbidden: This action requires one of these roles: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Middleware to enforce organization-level access
 * This prevents users from accessing other organizations' data
 */
export const enforceOrganizationAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    
    // Get organizationId from request parameters
    const organizationId = req.params.organizationId || req.query.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ message: "Bad request: Organization ID is required" });
    }
    
    // Check if user is a member of this organization
    if (req.user.organizationId !== organizationId) {
      // User is not a member of this organization
      return res.status(403).json({ 
        message: "Forbidden: You don't have access to this organization's data"
      });
    }
    
    next();
  } catch (error) {
    console.error("Organization access error:", error);
    return res.status(500).json({ message: "Internal server error during organization access check" });
  }
};

// Helper function to get a resource by its ID
async function getResourceById(resourceType: string, id: string | number): Promise<any> {
  switch (resourceType) {
    case 'platforms':
      return await storage.getPlatformById(Number(id));
    case 'conversations':
      return await storage.getConversationById(Number(id));
    case 'knowledge-base':
      return await storage.getKnowledgeBaseById(Number(id));
    case 'organizations':
      return await storage.getOrganization(String(id));
    default:
      return null;
  }
}

// Type augmentation for Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}