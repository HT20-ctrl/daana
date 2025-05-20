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
    // Execute each optimization separately instead of in a transaction
    console.log('Creating performance indexes...');

    // 1. Add index for platforms by user_id (frequent lookup)
    console.log('Adding index to platforms.user_id');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_platforms_user_id 
      ON platforms ("user_id");
    `);

    // 2. Add compound index for platform type and status (frequent filtering)
    console.log('Adding compound index to platforms.name and platforms.is_connected');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_platforms_name_connected
      ON platforms ("name", "is_connected");
    `);

    // 3. Add index for conversations by user_id (frequent lookup)
    console.log('Adding index to conversations.user_id');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id
      ON conversations ("user_id");
    `);

    // 4. Add index for conversations by is_active (frequent filtering)
    console.log('Adding index to conversations.is_active');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_conversations_is_active
      ON conversations ("is_active");
    `);
    
    // 5. Add index for conversations by last_message_at (for sorting)
    console.log('Adding index to conversations.last_message_at');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
      ON conversations ("last_message_at");
    `);

    // 6. Add index for messages by conversation_id (frequent lookup)
    console.log('Adding index to messages.conversation_id');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
      ON messages ("conversation_id");
    `);

    // 7. Add index for messages by is_from_customer (frequent filtering)
    console.log('Adding index to messages.is_from_customer');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_messages_is_from_customer
      ON messages ("is_from_customer");
    `);

    // 8. Add index for knowledge base items by user_id (frequent lookup)
    // Check if the table exists first
    console.log('Checking if knowledgeBase table exists');
    const knowledgeBaseExists = await client`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'knowledgeBase'
      );
    `;
    
    if (knowledgeBaseExists[0]?.exists) {
      console.log('Adding index to knowledgeBase.user_id');
      await client.unsafe(`
        CREATE INDEX IF NOT EXISTS idx_knowledgeBase_user_id
        ON "knowledgeBase" ("user_id");
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
    } else {
      console.log('knowledgeBase table does not exist, skipping related indexes');
    }

    // 10. Add index for analytics by user_id (frequent lookup)
    console.log('Adding index to analytics.user_id');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id
      ON analytics ("user_id");
    `);

    // 11. Add index for analytics by date (for time-series data)
    console.log('Adding index to analytics.date');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_analytics_date
      ON analytics ("date");
    `);

    // 12. Add compound index for filtering analytics by both user and date range
    console.log('Adding compound index to analytics.user_id and analytics.date');
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id_date
      ON analytics ("user_id", "date");
    `);

    // Analyze tables to update statistics for query planner
    console.log('Running ANALYZE to update query planner statistics');
    await client.unsafe('ANALYZE');
    
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
    console.error('Error optimizing database:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await client.end({ timeout: 5 });
  }
}

// Run the optimization
runDatabaseOptimizations().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});