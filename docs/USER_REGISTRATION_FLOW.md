# Dana AI Platform: User Registration Flow

## Overview

The Dana AI Platform supports self-service user registration with built-in multi-tenant security. New users can either create their own organization or join an existing organization through an invitation.

## Registration Methods

### 1. Standard Registration

New users can register by:
1. Visiting the landing page at [dana-ai-project.replit.app](https://dana-ai-project.replit.app)
2. Clicking the "Sign Up" button in the header
3. Completing the registration form with:
   - Email address
   - Password
   - First name
   - Last name
4. Creating their first organization during the onboarding process

### 2. Invitation-Based Registration

Users can join an existing organization through invitations:
1. Receive an email invitation from an organization admin
2. Click the invitation link in the email
3. Complete the registration form if they're a new user
4. Automatically gain access to the inviting organization

## Organization Creation During Registration

As part of the registration flow, new users must create or join an organization:

1. After completing the initial sign-up form, users see the "Create Your Organization" screen
2. They must provide:
   - Organization name
   - Industry (optional)
   - Size (optional)
   - Plan selection (Basic, Professional, Enterprise)
3. Upon submission, the system:
   - Creates the organization record
   - Sets the user as an administrator of this organization
   - Establishes the organization as the user's default

## Security Features

The registration process includes several security measures:

1. **Email Verification**: Users must verify their email address before gaining full access
2. **Password Requirements**: Strong password policies enforce security
3. **Organization Isolation**: Data isolation begins at registration with proper organization context
4. **Rate Limiting**: Protection against brute force and automated registration attempts
5. **Fraud Detection**: Measures to prevent creation of suspicious accounts

## Post-Registration

After registering and creating/joining an organization:

1. Users are directed to the onboarding process for their organization
2. They can immediately begin connecting platforms with their organization context
3. All actions they take will be associated with their current organization
4. They can create additional organizations later through the settings panel

## Technical Implementation

The registration flow maintains multi-tenant security through:

1. **User-Organization Mapping**: Each user is linked to one or more organizations through the `organization_members` table
2. **Default Organization**: The first organization a user joins becomes their default organization
3. **Organization Context**: All data created by the user is automatically associated with their current organization
4. **Role-Based Access**: Permissions are organization-specific and role-based

## Data Model

The following tables are involved in the registration process:

```
users
- id (primary key)
- email
- password_hash
- first_name
- last_name
- created_at
- updated_at

organizations
- id (primary key)
- name
- industry
- size
- plan
- created_at
- updated_at

organization_members
- id (primary key)
- user_id (foreign key to users)
- organization_id (foreign key to organizations)
- role (enum: admin, member, etc.)
- is_default (boolean)
- created_at
- updated_at
```