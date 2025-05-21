# Dana AI API Reference

This document provides comprehensive documentation for the Dana AI API, enabling developers to integrate with our platform and leverage its capabilities within their applications.

## Base URL

All API requests should be made to:

```
https://api.dana-ai.com/v1
```

For development and testing, you can use:

```
https://dev-api.dana-ai.com/v1
```

## Authentication

### API Keys

Dana AI uses API key authentication for all API requests. Include your API key in the request header:

```
Authorization: Bearer YOUR_API_KEY
```

To obtain an API key:
1. Log in to your Dana AI dashboard
2. Navigate to Settings > API Keys
3. Click "Generate New API Key"

### OAuth 2.0

For user-specific operations, Dana AI supports OAuth 2.0. To implement:

1. Register your application in the Dana AI Developer Console
2. Redirect users to our authorization URL
3. Exchange the authorization code for access and refresh tokens
4. Use the access token in the Authorization header

## API Endpoints

### Authentication Endpoints

#### Get Access Token

```http
POST /auth/token
```

Request body:
```json
{
  "grant_type": "authorization_code",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "YOUR_REDIRECT_URI"
}
```

Response:
```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "REFRESH_TOKEN"
}
```

#### Refresh Access Token

```http
POST /auth/token
```

Request body:
```json
{
  "grant_type": "refresh_token",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "refresh_token": "REFRESH_TOKEN"
}
```

Response:
```json
{
  "access_token": "NEW_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "NEW_REFRESH_TOKEN"
}
```

### Platform Endpoints

#### List Connected Platforms

```http
GET /platforms
```

Parameters:
- `status` (optional): Filter by connection status (`active`, `inactive`)
- `type` (optional): Filter by platform type (`social`, `crm`, `email`)

Response:
```json
{
  "platforms": [
    {
      "id": "platform_123",
      "type": "social",
      "name": "Facebook",
      "status": "active",
      "connected_at": "2025-05-01T10:30:00Z",
      "last_sync": "2025-05-21T08:15:00Z"
    },
    {
      "id": "platform_124",
      "type": "crm",
      "name": "Salesforce",
      "status": "active",
      "connected_at": "2025-04-15T14:20:00Z",
      "last_sync": "2025-05-21T07:45:00Z"
    }
  ],
  "count": 2
}
```

#### Connect Platform

```http
POST /platforms/connect
```

Request body:
```json
{
  "platform_type": "social",
  "platform_name": "Facebook",
  "credentials": {
    "app_id": "YOUR_APP_ID",
    "app_secret": "YOUR_APP_SECRET",
    "access_token": "ACCESS_TOKEN"
  }
}
```

Response:
```json
{
  "id": "platform_125",
  "type": "social",
  "name": "Facebook",
  "status": "active",
  "connected_at": "2025-05-21T09:45:00Z"
}
```

#### Disconnect Platform

```http
DELETE /platforms/{platform_id}
```

Response:
```json
{
  "id": "platform_125",
  "status": "disconnected",
  "disconnected_at": "2025-05-21T10:15:00Z"
}
```

### Conversation Endpoints

#### List Conversations

```http
GET /conversations
```

Parameters:
- `platform_id` (optional): Filter by platform ID
- `status` (optional): Filter by status (`active`, `resolved`, `pending`)
- `from_date` (optional): Filter by start date (ISO 8601 format)
- `to_date` (optional): Filter by end date (ISO 8601 format)
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

Response:
```json
{
  "conversations": [
    {
      "id": "conv_456",
      "platform_id": "platform_123",
      "customer": {
        "id": "cust_789",
        "name": "Jane Smith",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "status": "active",
      "last_message": {
        "content": "I need help with my order",
        "timestamp": "2025-05-21T08:30:00Z",
        "is_from_customer": true
      },
      "created_at": "2025-05-20T14:15:00Z",
      "updated_at": "2025-05-21T08:30:00Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0,
  "total": 1
}
```

#### Get Conversation

```http
GET /conversations/{conversation_id}
```

Response:
```json
{
  "id": "conv_456",
  "platform_id": "platform_123",
  "platform_type": "social",
  "platform_name": "Facebook",
  "customer": {
    "id": "cust_789",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "avatar_url": "https://example.com/avatar.jpg",
    "first_seen_at": "2025-03-15T10:30:00Z"
  },
  "status": "active",
  "assignee": {
    "id": "user_101",
    "name": "John Doe",
    "email": "john.doe@company.com"
  },
  "tags": ["urgent", "order-issue"],
  "created_at": "2025-05-20T14:15:00Z",
  "updated_at": "2025-05-21T08:30:00Z"
}
```

#### Get Conversation Messages

```http
GET /conversations/{conversation_id}/messages
```

Parameters:
- `limit` (optional): Number of results per page (default: 50)
- `before` (optional): Message ID to fetch messages before
- `after` (optional): Message ID to fetch messages after

Response:
```json
{
  "messages": [
    {
      "id": "msg_123",
      "conversation_id": "conv_456",
      "content": "Hello, I need help with my recent order #12345",
      "sender": {
        "type": "customer",
        "id": "cust_789",
        "name": "Jane Smith"
      },
      "created_at": "2025-05-20T14:15:00Z",
      "attachments": []
    },
    {
      "id": "msg_124",
      "conversation_id": "conv_456",
      "content": "Hi Jane, I'd be happy to help with your order. Let me look that up for you.",
      "sender": {
        "type": "agent",
        "id": "user_101",
        "name": "John Doe"
      },
      "created_at": "2025-05-20T14:20:00Z",
      "attachments": []
    }
  ],
  "has_more": false
}
```

#### Send Message

```http
POST /conversations/{conversation_id}/messages
```

Request body:
```json
{
  "content": "I've checked your order and it will be delivered tomorrow.",
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/tracking.png"
    }
  ]
}
```

Response:
```json
{
  "id": "msg_125",
  "conversation_id": "conv_456",
  "content": "I've checked your order and it will be delivered tomorrow.",
  "sender": {
    "type": "agent",
    "id": "user_101",
    "name": "John Doe"
  },
  "created_at": "2025-05-21T10:45:00Z",
  "attachments": [
    {
      "id": "att_001",
      "type": "image",
      "url": "https://example.com/tracking.png"
    }
  ]
}
```

### Knowledge Base Endpoints

#### List Knowledge Base Items

```http
GET /knowledge-base
```

Parameters:
- `category` (optional): Filter by category
- `query` (optional): Search term
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

Response:
```json
{
  "items": [
    {
      "id": "kb_123",
      "title": "How to Process Returns",
      "content": "To process a return, follow these steps...",
      "category": "Customer Support",
      "tags": ["returns", "refunds", "procedures"],
      "created_at": "2025-04-10T09:30:00Z",
      "updated_at": "2025-05-15T11:20:00Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0,
  "total": 1
}
```

#### Get Knowledge Base Item

```http
GET /knowledge-base/{item_id}
```

Response:
```json
{
  "id": "kb_123",
  "title": "How to Process Returns",
  "content": "To process a return, follow these steps...",
  "html_content": "<h1>How to Process Returns</h1><p>To process a return, follow these steps...</p>",
  "category": "Customer Support",
  "tags": ["returns", "refunds", "procedures"],
  "author": {
    "id": "user_102",
    "name": "Sarah Johnson"
  },
  "created_at": "2025-04-10T09:30:00Z",
  "updated_at": "2025-05-15T11:20:00Z"
}
```

#### Create Knowledge Base Item

```http
POST /knowledge-base
```

Request body:
```json
{
  "title": "Shipping Policy",
  "content": "Our shipping policy is as follows...",
  "category": "Policies",
  "tags": ["shipping", "delivery", "policy"]
}
```

Response:
```json
{
  "id": "kb_124",
  "title": "Shipping Policy",
  "content": "Our shipping policy is as follows...",
  "category": "Policies",
  "tags": ["shipping", "delivery", "policy"],
  "created_at": "2025-05-21T11:00:00Z",
  "updated_at": "2025-05-21T11:00:00Z"
}
```

### Analytics Endpoints

#### Get Conversation Metrics

```http
GET /analytics/conversations
```

Parameters:
- `start_date`: Start date for analytics (ISO 8601 format)
- `end_date`: End date for analytics (ISO 8601 format)
- `platform_id` (optional): Filter by platform ID
- `interval` (optional): Time grouping (`day`, `week`, `month`)

Response:
```json
{
  "start_date": "2025-05-01T00:00:00Z",
  "end_date": "2025-05-21T23:59:59Z",
  "interval": "day",
  "metrics": {
    "total_conversations": 245,
    "avg_response_time": 420,
    "resolution_rate": 0.92,
    "time_series": [
      {
        "date": "2025-05-01T00:00:00Z",
        "conversation_count": 12,
        "response_time": 450,
        "resolution_rate": 0.90
      },
      // Additional days...
    ]
  }
}
```

## Webhook Events

Dana AI can send webhook notifications for various events. Configure webhooks in your Dana AI dashboard.

### Event Types

| Event Type | Description |
|------------|-------------|
| `conversation.created` | A new conversation has started |
| `conversation.updated` | A conversation's status was updated |
| `message.created` | A new message was added to a conversation |
| `platform.connected` | A new platform was connected |
| `platform.disconnected` | A platform was disconnected |

### Webhook Payload Example

```json
{
  "event": "message.created",
  "timestamp": "2025-05-21T14:30:00Z",
  "data": {
    "message": {
      "id": "msg_126",
      "conversation_id": "conv_457",
      "content": "When will my order arrive?",
      "sender": {
        "type": "customer",
        "id": "cust_790"
      },
      "created_at": "2025-05-21T14:30:00Z"
    }
  }
}
```

## Rate Limits

Dana AI API enforces rate limits to ensure service stability:

| Plan | Requests per minute | Requests per day |
|------|---------------------|------------------|
| Basic | 60 | 10,000 |
| Pro | 120 | 50,000 |
| Enterprise | 300 | 1,000,000 |

When you exceed a rate limit, the API returns a `429 Too Many Requests` status code.

## Error Handling

Dana AI API returns standard HTTP status codes and JSON error responses:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The conversation ID is invalid or not found.",
    "status": 404,
    "request_id": "req_abc123def456"
  }
}
```

Common error codes:

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request - The request is malformed |
| 401 | Unauthorized - Invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Something went wrong on our side |

## SDKs and Libraries

We provide official libraries for popular programming languages:

- [JavaScript/TypeScript](https://github.com/dana-ai/dana-js)
- [Python](https://github.com/dana-ai/dana-python)
- [Ruby](https://github.com/dana-ai/dana-ruby)
- [PHP](https://github.com/dana-ai/dana-php)
- [Java](https://github.com/dana-ai/dana-java)
- [Go](https://github.com/dana-ai/dana-go)

## Support

For API support, contact:

- Email: api-support@dana-ai.com
- Developer Forum: [community.dana-ai.com](https://community.dana-ai.com)
- Documentation: [docs.dana-ai.com](https://docs.dana-ai.com)