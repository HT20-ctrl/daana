/**
 * Multi-Tenant Middleware
 * 
 * This middleware ensures proper data isolation between organizations
 * by extracting and validating organization context for all API requests.
 */

import { storage } from '../storage.js';

/**
 * Add organization context to all authenticated requests
 * This extracts the organization ID from the request and attaches it
 * to the request object for use in route handlers
 */
export async function addOrganizationContext(req, res, next) {
  try {
    // Skip for unauthenticated requests
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return next();
    }
    
    const userId = req.user.claims?.sub;
    if (!userId) {
      return next();
    }
    
    // Set default fields
    req.userId = userId;
    
    // Extract organization from query param or header if provided
    const requestedOrgId = req.query.organizationId || req.headers['x-organization-id'];
    
    if (requestedOrgId) {
      // If organization is requested, verify user's membership
      const userOrgs = await storage.getOrganizationsByUserId(userId);
      const hasAccess = userOrgs.some(org => org.id === requestedOrgId);
      
      if (hasAccess) {
        // User has access to the requested organization
        req.organizationId = requestedOrgId;
      } else {
        // Default to the first organization if user doesn't have access to requested org
        req.organizationId = userOrgs.length > 0 ? userOrgs[0].id : null;
      }
    } else {
      // No specific organization requested, use the first available
      const userOrgs = await storage.getOrganizationsByUserId(userId);
      req.organizationId = userOrgs.length > 0 ? userOrgs[0].id : null;
    }
    
    // Log for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Request organization context: user ${userId}, organization ${req.organizationId}`);
    }
    
    next();
  } catch (error) {
    console.error('Error in organization context middleware:', error);
    // Continue without organization context rather than failing the request
    next();
  }
}

/**
 * Enforce organization access on protected resources
 * This middleware prevents access to resources from other organizations
 */
export function enforceOrganizationAccess(req, res, next) {
  // If no organization context, deny access
  if (!req.organizationId) {
    return res.status(403).json({ 
      message: "You don't have access to any organization" 
    });
  }
  
  // Continue to the route handler with organization context
  next();
}

/**
 * Enforce specific organization role
 * This middleware checks if a user has the required role in the organization
 */
export function enforceOrganizationRole(requiredRole) {
  return async (req, res, next) => {
    try {
      if (!req.organizationId || !req.userId) {
        return res.status(403).json({ 
          message: "Organization access required" 
        });
      }
      
      // Get organization memberships for this user
      const membershipList = await storage.getOrganizationMembers(req.organizationId);
      const userMembership = membershipList.find(m => m.userId === req.userId);
      
      // Check if user has the required role
      if (!userMembership || userMembership.role !== requiredRole) {
        return res.status(403).json({ 
          message: `Required role '${requiredRole}' in this organization` 
        });
      }
      
      // User has the required role, allow access
      next();
    } catch (error) {
      console.error('Error in organization role middleware:', error);
      res.status(500).json({ message: "Error verifying organization role" });
    }
  };
}