import { Request, Response, NextFunction } from 'express';

/**
 * Multi-Tenant Security Middleware
 * 
 * This middleware extracts the organization context from incoming requests
 * and makes it available throughout the request lifecycle.
 * 
 * The organization ID can be provided in either:
 * 1. HTTP header: X-Organization-ID
 * 2. Query parameter: organizationId
 * 3. Request body: organizationId
 * 
 * This ensures proper data isolation between organizations in our multi-tenant system.
 */
export function multiTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract organization ID from various sources (in order of precedence)
  const organizationId = 
    req.headers['x-organization-id'] || 
    req.query.organizationId || 
    (req.body && req.body.organizationId);

  if (organizationId) {
    // Set the organization ID on the request object
    // TypeScript definition extension
    (req as any).organizationId = 
      typeof organizationId === 'string' ? organizationId : String(organizationId);
    
    // Log for debugging (remove in production)
    // console.debug(`Request associated with organization: ${(req as any).organizationId}`);
  }

  next();
}

/**
 * Multi-Tenant Authorization Middleware
 * 
 * This middleware verifies that a user has access to the requested organization.
 * It should be used on routes that require organization-specific data.
 * 
 * If no organization ID is provided or the user doesn't have access to the
 * requested organization, the request is rejected with a 403 Forbidden status.
 */
export function requireOrganizationAccess(req: Request, res: Response, next: NextFunction) {
  // Skip for non-authenticated routes
  if (!req.isAuthenticated || !(req.isAuthenticated as Function)()) {
    return next();
  }

  const organizationId = (req as any).organizationId;
  
  if (!organizationId) {
    return res.status(403).json({
      error: 'Organization context required',
      message: 'This request requires an organization context'
    });
  }

  // Get user's organizations from the session
  const userOrganizations = (req.user as any)?.organizations || [];
  
  // Check if user has access to the requested organization
  const hasAccess = userOrganizations.some(
    (org: any) => org.id === organizationId
  );

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Organization access denied',
      message: 'You do not have access to the requested organization'
    });
  }

  next();
}

/**
 * Helper function to extract organization ID from request
 * Can be used in route handlers to get the current organization context
 */
export function getOrganizationId(req: Request): string | null {
  return (req as any).organizationId || null;
}

/**
 * Helper to create organization-aware queries
 * Adds organization filtering to database queries
 */
export function withOrganizationContext(
  query: any, 
  req: Request, 
  organizationFieldName: string = 'organization_id'
): any {
  const organizationId = getOrganizationId(req);
  
  if (organizationId) {
    // Add organization filter
    return {
      ...query,
      where: {
        ...query.where,
        [organizationFieldName]: organizationId
      }
    };
  }
  
  return query;
}