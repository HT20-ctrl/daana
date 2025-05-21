/**
 * Multi-Tenant Helper
 * 
 * Utility functions to support multi-tenant data isolation across
 * the Dana AI platform.
 */

/**
 * Filters a collection of items based on organization ID
 * This is used as a safety layer to ensure data isolation
 * 
 * @param {Array} items - Array of data objects that might have organizationId
 * @param {string} organizationId - Current organization context
 * @returns {Array} - Filtered array containing only items from this organization
 */
export function filterByOrganization(items, organizationId) {
  if (!items || !Array.isArray(items)) {
    return [];
  }
  
  if (!organizationId) {
    return [];
  }
  
  return items.filter(item => 
    // Include if item has matching organizationId or no organizationId
    !item.organizationId || item.organizationId === organizationId
  );
}

/**
 * Creates an organization-specific cache key
 * Ensures cache data is isolated between organizations
 * 
 * @param {string} baseKey - The base cache key
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {string} - Organization-specific cache key
 */
export function createOrgCacheKey(baseKey, userId, organizationId) {
  return `${baseKey}:${userId}:${organizationId || 'default'}`;
}

/**
 * Checks if a user has access to a specific data item based on organization
 * 
 * @param {object} item - Data item to check
 * @param {string} organizationId - Current organization context
 * @returns {boolean} - Whether user has access to this item
 */
export function hasOrganizationAccess(item, organizationId) {
  if (!item) {
    return false;
  }
  
  // Allow access if the item has no organization restriction
  // or if it belongs to the current organization
  return !item.organizationId || item.organizationId === organizationId;
}

/**
 * Enforces organization context for data operations
 * Ensures all new data is properly associated with an organization
 * 
 * @param {object} data - Data to enhance with organization context
 * @param {string} organizationId - Organization ID to associate
 * @returns {object} - Data with organization context
 */
export function ensureOrganizationContext(data, organizationId) {
  if (!data) {
    return { organizationId };
  }
  
  return {
    ...data,
    organizationId
  };
}