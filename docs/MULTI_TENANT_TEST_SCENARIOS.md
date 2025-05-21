# Multi-Tenant Security Test Scenarios

This document outlines real-world test scenarios to validate the multi-tenant security implementation in the Dana AI Platform.

## Setup for Testing

### Test Users

1. **Admin User**
   - Email: admin@example.com
   - Member of: Organization A and Organization B
   - Role: Administrator in both organizations

2. **Regular User**
   - Email: user@example.com
   - Member of: Organization A only
   - Role: Standard user

3. **Marketing Manager**
   - Email: marketing@example.com
   - Member of: Organization B only
   - Role: Marketing manager

### Test Organizations

1. **Organization A: "Global Marketing Inc."**
   - Plan: Premium
   - Connected platforms: Facebook, Twitter, LinkedIn
   - Knowledge Base: 15 documents

2. **Organization B: "Local Business LLC"**
   - Plan: Basic
   - Connected platforms: Instagram, Facebook
   - Knowledge Base: 5 documents

## Test Scenarios

### Scenario 1: Organization Switching & Data Isolation

**Steps:**
1. Log in as Admin User
2. Note the current organization (Organization A)
3. View the list of connected platforms (should see Facebook, Twitter, LinkedIn)
4. View the knowledge base (should see 15 documents)
5. Switch to Organization B using the organization selector
6. View the list of connected platforms (should see Instagram, Facebook only)
7. View the knowledge base (should see 5 documents)

**Expected Results:**
- Data shown should change completely when switching organizations
- No data from Organization A should appear when viewing Organization B
- Platform connections should be organization-specific

### Scenario 2: Cross-Organization Access Control

**Steps:**
1. Log in as Regular User
2. Verify access to Organization A data
3. Attempt to switch to Organization B
4. Attempt to access Organization B data directly via URL manipulation

**Expected Results:**
- Regular User should have full access to Organization A data
- Organization selector should not show Organization B as an option
- Direct URL attempts to access Organization B data should be rejected with 403 Forbidden

### Scenario 3: Data Creation & Organization Context

**Steps:**
1. Log in as Admin User
2. Switch to Organization A
3. Create a new platform connection
4. Create a new knowledge base document
5. Switch to Organization B
6. Verify the new items are not visible in Organization B
7. Create similar items in Organization B
8. Switch back to Organization A and verify proper isolation

**Expected Results:**
- New items created in Organization A should only be visible in Organization A
- New items created in Organization B should only be visible in Organization B
- No cross-contamination of data between organizations

### Scenario 4: API Security Testing

**Steps:**
1. Log in as Marketing Manager (Organization B only)
2. Using browser developer tools, capture an API request
3. Modify the request to:
   - Remove organization header
   - Change organization ID to Organization A's ID
4. Send the modified request

**Expected Results:**
- Requests without organization context should be rejected
- Requests with unauthorized organization IDs should be rejected
- Error responses should not leak sensitive information

### Scenario 5: Cache Isolation

**Steps:**
1. Log in as Admin User
2. Switch to Organization A
3. Navigate to the platforms page and note load time
4. Navigate to another page and back to platforms (should be cached)
5. Switch to Organization B
6. Navigate to platforms page and note load time (should be a cache miss)

**Expected Results:**
- Second load of platforms in Organization A should be faster (cached)
- First load of platforms in Organization B should be slower (cache miss)
- Cache keys should include organization context

### Scenario 6: Bulk Operations & Organization Boundaries

**Steps:**
1. Log in as Admin User
2. Switch to Organization A
3. Select multiple knowledge base documents
4. Attempt a bulk operation (tag, export, delete)
5. Switch to Organization B during the operation

**Expected Results:**
- Bulk operations should only affect data in the original organization
- Organization context should be maintained throughout operations
- Switching organizations during operation should not cause errors or data leakage

### Scenario 7: User Management & Organization Context

**Steps:**
1. Log in as Admin User
2. Navigate to user management in Organization A
3. Invite a new user to Organization A
4. Switch to Organization B
5. Verify the invited user does not appear in Organization B's user list

**Expected Results:**
- User invitations should be organization-specific
- User permissions should be maintained separately per organization
- User lists should show only members of the current organization

## Reporting Results

For each scenario, record:
1. Whether the expected results were achieved
2. Any unexpected behavior or security concerns
3. Recommendations for improvements

All failed tests should be treated as high-priority security issues and addressed immediately.

Remember that these tests should be performed in a test environment with test data, not in production with real customer data.