/**
 * Database optimization script
 * 
 * This script applies performance optimizations to the PostgreSQL database 
 * by adding indexes for frequently queried columns.
 * 
 * Usage: npx tsx scripts/optimize-database.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set.');
  process.exit(1);
}

async function runDatabaseOptimizations() {
  console.log('Starting database optimization process...');
  
  // Create a connection to the database
  const client = postgres(connectionString as string, {
    onnotice: () => {}, // Suppress notice messages
  });

  try {
    // Start transaction for the optimization process
    await client`BEGIN`;
    
    console.log('Creating performance indexes...');

    // 1. Add index for platforms by userId (frequent lookup)
    console.log('Adding index to platforms.userId');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_platforms_userId 
      ON platforms ("userId");
    `);

    // 2. Add compound index for platform type and status (frequent filtering)
    console.log('Adding compound index to platforms.name and platforms.isConnected');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_platforms_name_connected
      ON platforms ("name", "isConnected");
    `);

    // 3. Add index for conversations by userId (frequent lookup)
    console.log('Adding index to conversations.userId');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_conversations_userId
      ON conversations ("userId");
    `);

    // 4. Add index for conversations by isActive (frequent filtering)
    console.log('Adding index to conversations.isActive');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_conversations_isActive
      ON conversations ("isActive");
    `);
    
    // 5. Add index for conversations by lastMessageAt (for sorting)
    console.log('Adding index to conversations.lastMessageAt');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_conversations_lastMessageAt
      ON conversations ("lastMessageAt");
    `);

    // 6. Add index for messages by conversationId (frequent lookup)
    console.log('Adding index to messages.conversationId');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversationId
      ON messages ("conversationId");
    `);

    // 7. Add index for messages by isFromCustomer (frequent filtering)
    console.log('Adding index to messages.isFromCustomer');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_messages_isFromCustomer
      ON messages ("isFromCustomer");
    `);

    // 8. Add index for knowledge base items by userId (frequent lookup)
    console.log('Adding index to knowledgeBase.userId');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_knowledgeBase_userId
      ON "knowledgeBase" ("userId");
    `);

    // 9. Add full-text search index on knowledge base content if not exists
    // This only works in PostgreSQL but provides major search performance improvements
    console.log('Adding full-text search index to knowledgeBase.content');
    await client.unsafe(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);
    
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_knowledgeBase_content_trgm
      ON "knowledgeBase" USING GIN (content gin_trgm_ops)
      WHERE content IS NOT NULL;
    `);

    // 10. Add index for analytics by userId (frequent lookup)
    console.log('Adding index to analytics.userId');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_analytics_userId
      ON analytics ("userId");
    `);

    // 11. Add index for analytics by date (for time-series data)
    console.log('Adding index to analytics.date');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_analytics_date
      ON analytics ("date");
    `);

    // 12. Add compound index for filtering analytics by both user and date range
    console.log('Adding compound index to analytics.userId and analytics.date');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_analytics_userId_date
      ON analytics ("userId", "date");
    `);

    // Analyze tables to update statistics for query planner
    console.log('Running ANALYZE to update query planner statistics');
    await client.unsafe('ANALYZE');

    // Commit all the changes
    await client`COMMIT`;
    
    console.log('Database optimization completed successfully!');
    
    // Print database statistics after optimization
    console.log('\nDatabase statistics after optimization:');
    const indexStats = await client`
      SELECT
        schemaname as schema,
        relname as table,
        indexrelname as index,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM
        pg_stat_user_indexes
      ORDER BY
        relname, indexrelname;
    `;
    
    console.table(indexStats);

  } catch (error) {
    // Rollback in case of error
    await client`ROLLBACK`;
    console.error('Error optimizing database:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the optimization
runDatabaseOptimizations().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});