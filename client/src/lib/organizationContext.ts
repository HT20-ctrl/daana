/**
 * Organization Context Utilities
 * 
 * These utilities help maintain proper organization context
 * throughout the application for multi-tenant data isolation.
 */

/**
 * Get the current organization ID from local storage
 * @returns The current organization ID or null if not set
 */
export function getCurrentOrganizationId(): string | null {
  return localStorage.getItem('currentOrganizationId');
}

/**
 * Set the current organization ID in local storage
 * @param organizationId The organization ID to set as current
 */
export function setCurrentOrganizationId(organizationId: string): void {
  localStorage.setItem('currentOrganizationId', organizationId);
}

/**
 * Clear the current organization ID from local storage
 * This is typically done during logout
 */
export function clearCurrentOrganizationId(): void {
  localStorage.removeItem('currentOrganizationId');
}

/**
 * Add organization context to a URL as a query parameter
 * This is used for non-standard API requests that don't use fetch directly
 * @param url The URL to add the organization context to
 * @returns The URL with organization context query parameter
 */
export function addOrganizationToUrl(url: string): string {
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}organizationId=${organizationId}`;
}

/**
 * Add organization context to request headers
 * @param headers The headers object to add organization context to
 * @returns Updated headers with organization context
 */
export function addOrganizationToHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return headers;
  
  return {
    ...headers,
    'X-Organization-ID': organizationId
  };
}

/**
 * Create organization-specific cache key for React Query
 * @param baseKey The base cache key
 * @returns Cache key with organization context
 */
export function getOrganizationQueryKey(baseKey: string | string[]): (string | string[])[] {
  const organizationId = getCurrentOrganizationId();
  const key = Array.isArray(baseKey) ? baseKey : [baseKey];
  
  if (!organizationId) return [key];
  return [key, { organizationId }];
}