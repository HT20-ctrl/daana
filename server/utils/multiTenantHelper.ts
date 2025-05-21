import { Request } from 'express';

/**
 * Multi-tenant helper functions for data isolation and security
 * These utilities ensure organization data boundaries are properly enforced
 */

/**
 * Filter query results by organization ID
 * Helps ensure data isolation between organizations in multi-tenant applications
 * 
 * @param data The array of data objects to filter
 * @param req The Express request object containing organization context
 * @returns Filtered array containing only data belonging to the current organization
 */
export function filterByOrganization<T extends { organizationId?: string }>(
  data: T[],
  req: Request
): T[] {
  const organizationId = (req as any).organizationId;
  
  if (!organizationId) {
    console.warn('No organization context found for filtering');
    return [];
  }
  
  return data.filter(item => 
    // Include items that either have no organizationId or match the current organization
    !item.organizationId || item.organizationId === organizationId
  );
}

/**
 * Ensure organization context is present in data operations
 * Used to add organization ID to database queries and data creation/updates
 * 
 * @param data The object to augment with organization context
 * @param req The Express request object containing organization context
 * @returns Data object with organization ID added
 */
export function ensureOrganizationContext<T extends Record<string, any>>(
  data: T,
  req: Request
): T & { organizationId: string } {
  const organizationId = (req as any).organizationId;
  
  if (!organizationId) {
    throw new Error('Organization context required but not found in request');
  }
  
  return {
    ...data,
    organizationId
  };
}

/**
 * Extract organization ID from request
 * Helper function to get the current organization context
 * 
 * @param req The Express request object
 * @returns Organization ID string or null if not available
 */
export function getOrganizationId(req: Request): string | null {
  return (req as any).organizationId || null;
}

/**
 * Create organization-specific cache key
 * Used to ensure proper isolation of cached data in multi-tenant applications
 * 
 * @param baseKey The base cache key
 * @param req The Express request object containing organization context
 * @returns Cache key with organization context included
 */
export function getOrganizationCacheKey(baseKey: string, req: Request): string {
  const organizationId = getOrganizationId(req);
  const userId = (req as any).userId || (req as any).user?.id;
  
  if (!organizationId) {
    throw new Error('Organization context required for cache key generation');
  }
  
  return `${baseKey}:${userId}:${organizationId}`;
}