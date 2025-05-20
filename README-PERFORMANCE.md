# Performance Optimization Guide

This guide explains the performance optimizations that have been implemented in the Dana AI Platform and how to apply them.

## Implemented Optimizations

### 1. Frontend Optimizations

- **Code Splitting with Lazy Loading**: All page components are now loaded on-demand using React.lazy() and Suspense
- **Enhanced Caching Strategy**: Dynamic cache times based on data type (short cache for messages, longer for platforms)
- **Skeleton Loading UI**: Improved user experience with placeholder content during lazy loading
- **Custom React Query Hooks**: Specialized hooks for optimized data fetching patterns with proper cache management
- **Performance Monitoring**: Client-side metrics collection for render times and API requests
- **Advanced Cache Invalidation**: Intelligent cache invalidation strategies for related data

### 2. Database Optimizations

- **Comprehensive Database Indexing**: Added specialized indexes for all major query patterns:
  - Single-column indexes for frequently queried fields (user_id, conversation_id)
  - Compound indexes for complex filtering operations (platforms by name and connection status)
  - Sorting indexes for ordered data access (conversations by last_message_at)
  - Full-text search indexes for knowledge base content using PostgreSQL's pg_trgm extension
- **Query Optimization**: Customized query functions that leverage the new index structure
- **Database Connection Management**: Enhanced connection pooling and timeout handling
- **Read-Only Transactions**: Specialized transactions for queries that don't modify data

### 3. Infrastructure Optimizations

- **Response Compression**: Reduced bandwidth usage and faster data transfer
- **Batched API Requests**: Combined related data requests for efficiency
- **Error Handling Performance**: Structured error categorization with fast recovery paths
- **Memory Optimization**: Efficient data structures and automatic resource cleanup

## Database Optimization Details (May 2025)

The following indexes have been added to optimize database performance:

| Table | Index Name | Columns | Purpose |
|-------|------------|---------|---------|
| platforms | idx_platforms_user_id | user_id | Fast lookup of platforms by user |
| platforms | idx_platforms_name_connected | name, is_connected | Efficient filtering by platform type and status |
| conversations | idx_conversations_user_id | user_id | Fast lookup of conversations by user |
| conversations | idx_conversations_is_active | is_active | Quick filtering of active/inactive conversations |
| conversations | idx_conversations_last_message_at | last_message_at | Efficient sorting by recency |
| messages | idx_messages_conversation_id | conversation_id | Fast retrieval of messages by conversation |
| messages | idx_messages_is_from_customer | is_from_customer | Quick filtering by message sender type |
| analytics | idx_analytics_user_id | user_id | Fast lookup of analytics by user |
| analytics | idx_analytics_date | date | Efficient date-based filtering |
| analytics | idx_analytics_user_id_date | user_id, date | Optimized date range queries per user |

## Applying Database Optimizations

To apply the database performance optimizations, run the following command:

```bash
npx tsx scripts/optimize-database.ts
```

This script will:
1. Add all the necessary indexes to the database tables
2. Create specialized compound indexes for complex filtering operations
3. Add PostgreSQL-specific optimizations like the pg_trgm extension
4. Update the PostgreSQL query planner statistics with ANALYZE
5. Output a table of all applied indexes for verification

## Using Optimized Queries

The optimized query functions are available in `server/query-optimizations.ts`. Use these functions instead of writing raw queries to ensure best performance:

Example usage:

```typescript
import { conversationQueries } from "./query-optimizations";

// Get recent conversations with optimized query
const recentConversations = await conversationQueries.getRecent(userId, 10);

// Get platform statistics with optimized filtering
const connectedPlatforms = await platformQueries.getConnected(userId);

// Search knowledge base with full-text optimization
const searchResults = await knowledgeBaseQueries.search(userId, searchTerm);
```

## Client-Side Performance Utilities

New client-side performance utilities have been added in `client/src/lib/performance.ts`:

```typescript
import { trackPageLoad, trackApiRequest, trackRenderTime } from "@lib/performance";

// Track page load performance
useEffect(() => {
  trackPageLoad("dashboard");
}, []);

// Track API request performance
const fetchData = async () => {
  const startTime = performance.now();
  const data = await fetch("/api/data");
  trackApiRequest("/api/data", performance.now() - startTime);
};

// Track component render time
const RenderTracker = ({ component }) => {
  useEffect(() => {
    return () => trackRenderTime(component);
  }, [component]);
  
  return null;
};
```

## Performance Monitoring

Monitor the application's performance using:

1. **Browser Developer Tools**: Check network requests, rendering times, and memory usage
2. **Performance API Endpoints**: Use `/api/monitoring/performance` to get server-side metrics
3. **Client Performance Dashboard**: Check the application's Analytics section for performance metrics
4. **Database Query Analysis**: Run `EXPLAIN ANALYZE` on slow queries to identify optimization opportunities

## Troubleshooting

If you encounter any performance issues:

1. Check the database indexes are properly applied using the PostgreSQL administration tools
2. Ensure the React Query cache is configured correctly with appropriate stale times
3. Verify that lazy-loaded components are working correctly by checking network requests
4. Review server logs for any slow query warnings or connection timeout issues
5. Check client-side performance metrics to identify potential bottlenecks in rendering or data fetching