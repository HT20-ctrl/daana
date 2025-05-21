# Dana AI Platform Multi-Tenant Architecture

This document outlines the multi-tenant security architecture implemented in the Dana AI Platform to ensure complete data isolation between organizations.

## Overview

The Dana AI Platform employs a robust multi-tenant security model that isolates data at multiple levels:

1. **Database Layer**: Organization-specific data segregation
2. **API Layer**: Request filtering based on organization context
3. **Frontend Layer**: Organization-aware components and data fetching
4. **Caching Layer**: Organization-specific cache keys

This comprehensive approach ensures that users can only access data belonging to organizations they are members of, preventing any cross-organization data leakage.

## Core Components

### 1. Database Schema

All primary data tables include an `organization_id` column that associates each record with a specific organization:

- `users` - User accounts (may belong to multiple organizations)
- `organizations` - Organization details
- `organization_members` - User membership in organizations with role information
- `platforms` - Connected social media platforms
- `conversations` - Customer conversations
- `messages` - Individual messages
- `knowledge_base` - Knowledge base documents
- `analytics` - Usage analytics

### 2. Server-Side Implementation

#### Middleware

The server uses middleware to extract and enforce organization context:

- `multiTenantMiddleware`: Extracts organization context from requests via:
  - HTTP header: `X-Organization-ID`
  - Query parameter: `organizationId`
  - Request body: `organizationId`

- `requireOrganizationAccess`: Verifies user has access to the requested organization

#### Helper Utilities

Several utility functions help enforce organization boundaries:

- `filterByOrganization`: Filters query results by organization
- `ensureOrganizationContext`: Adds organization ID to data operations
- `getOrganizationId`: Extracts organization context from requests
- `getOrganizationCacheKey`: Creates organization-specific cache keys

### 3. Client-Side Implementation

#### Organization Context Provider

- `OrganizationProvider`: React context provider that manages organization state
- `useOrganizationContext`: Hook to access organization context throughout the application

#### API Request Handling

- All API requests include organization context via HTTP headers
- Query cache uses organization-specific keys
- Organization selector in the UI allows users to switch between organizations

#### Utility Functions

- `getCurrentOrganizationId`: Gets current organization from localStorage
- `setCurrentOrganizationId`: Updates current organization in localStorage
- `addOrganizationToUrl`: Adds organization context to URLs
- `addOrganizationToHeaders`: Adds organization context to request headers
- `getOrganizationQueryKey`: Creates organization-specific cache keys for React Query

## Security Principles

1. **Defense in Depth**: Multiple layers of security checks
2. **Least Privilege**: Users only access data from organizations they belong to
3. **Complete Isolation**: No data sharing between organizations
4. **Secure by Default**: All operations require organization context

## Implementation Details

### Database Queries

All database queries include organization filtering:

```typescript
// Example filtered query
const userPlatforms = await db.select()
  .from(platforms)
  .where(and(
    eq(platforms.user_id, userId),
    eq(platforms.organization_id, organizationId)
  ));
```

### API Routes

API routes enforce organization access:

```typescript
app.get("/api/platforms", isAuthenticated, requireOrganizationAccess, async (req, res) => {
  // Organization context is enforced by middleware
  const userId = req.userId;
  const organizationId = req.organizationId;
  
  // Get platforms with organization filtering
  const platforms = await storage.getPlatformsByUserAndOrganization(userId, organizationId);
  
  res.json(platforms);
});
```

### Frontend Components

The organization selector allows switching between organizations:

```tsx
// Example of organization selector component
function OrganizationSelector() {
  const { currentOrganization, organizations, switchOrganization } = useOrganizationContext();
  
  // Component code to render dropdown with organizations
}
```

## Testing Multi-Tenant Security

### Test Scenarios

1. **Cross-Organization Access**: Verify users cannot access data from organizations they don't belong to
2. **Organization Switching**: Verify data updates correctly when switching organizations
3. **API Access Control**: Verify API endpoints reject requests with invalid organization context
4. **Cache Isolation**: Verify cached data remains isolated between organizations

## Conclusion

The Dana AI Platform's multi-tenant architecture provides robust security and data isolation between organizations. This design ensures that even if multiple organizations use the same application instance, their data remains completely separate and secure.