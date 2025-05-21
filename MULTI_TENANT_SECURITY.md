# Dana AI Platform: Multi-Tenant Security Architecture

## Overview

Dana AI implements a robust multi-tenant security architecture to ensure complete data isolation between different organizations using the platform. This document explains the key components of this architecture and how they work together to maintain data security.

## Core Components

### 1. Database Schema

All primary tables in the Dana AI platform include an `organization_id` column that links to the organizations table:

- `users` - Associates users with their primary organization
- `platforms` - Ensures platform connections are isolated by organization
- `conversations` - Maintains conversation boundaries between organizations
- `messages` - Ensures message content is isolated by organization (via conversations)
- `knowledge_base` - Segregates knowledge base content by organization
- `analytics` - Provides organization-specific analytics and reporting

### 2. Organization Membership

The `organization_members` junction table manages the many-to-many relationship between users and organizations:

- Users can belong to multiple organizations with different roles
- Roles (owner, admin, member) control access levels within an organization
- Invitation workflow for adding new members to an organization

### 3. Security Middleware

The multi-tenant security architecture is enforced through several layers of middleware:

- `addOrganizationContext` - Automatically extracts and validates organization context for all authenticated requests
- `enforceOrganizationAccess` - Ensures users only access resources from organizations they belong to
- `enforceOrganizationRole` - Provides role-based access control within organizations

### 4. Query Security

Database queries are enhanced with organization context to ensure proper data isolation:

- All queries include organization_id filters
- Special multi-tenant query utilities in `multiTenantStorage.ts` provide security-enhanced operations
- Helper functions in `multiTenantHelper.js` ensure consistent organization filtering

## How It Works

1. When a user logs in, their organization memberships are retrieved
2. The `addOrganizationContext` middleware adds organization_id to their requests
3. API endpoints use this context to filter data by organization
4. Database queries include organization_id filters to maintain isolation
5. Only data belonging to the user's current organization is returned

## Security Benefits

This architecture provides several key benefits:

1. **Complete Data Isolation**: Data from one organization cannot be accessed by users from another organization
2. **Defense in Depth**: Multiple security layers ensure isolation even if one layer fails
3. **Performance Optimization**: Organization-specific indexes improve query performance
4. **Flexible Membership**: Users can be members of multiple organizations

## Best Practices for Developers

When extending the Dana AI platform:

1. Always use the `enforceOrganizationAccess` middleware for authenticated routes
2. Include organization context in all database operations
3. Use the multi-tenant query utilities for database operations
4. Test all new features with multiple organization scenarios

## Conclusion

The multi-tenant architecture of Dana AI provides enterprise-grade security and data isolation. This ensures that organization data remains protected while enabling the flexibility of a shared platform infrastructure.