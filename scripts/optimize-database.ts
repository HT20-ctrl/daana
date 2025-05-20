/**
 * Database optimization script
 * 
 * This script applies performance optimizations to the PostgreSQL database 
 * by adding indexes for frequently queried columns.
 * 
 * Usage: npx tsx scripts/optimize-database.ts
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users, platforms, conversations, messages, knowledgeBase, analytics } from '../shared/schema';
import { sql } from 'drizzle-orm';

const INDEXING_QUERIES = [
  // Platform indexes
  `CREATE INDEX IF NOT EXISTS platforms_user_id_idx ON platforms (user_id)`,
  `CREATE INDEX IF NOT EXISTS platforms_name_idx ON platforms (name)`,
  `CREATE INDEX IF NOT EXISTS platforms_is_connected_idx ON platforms (is_connected)`,
  
  // Conversation indexes
  `CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON conversations (user_id)`,
  `CREATE INDEX IF NOT EXISTS conversations_platform_id_idx ON conversations (platform_id)`,
  `CREATE INDEX IF NOT EXISTS conversations_active_user_idx ON conversations (user_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON conversations (last_message_at)`,
  
  // Message indexes
  `CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages (conversation_id)`,
  `CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at)`,
  `CREATE INDEX IF NOT EXISTS messages_ai_generated_idx ON messages (is_ai_generated)`,
  
  // Knowledge base indexes
  `CREATE INDEX IF NOT EXISTS knowledge_base_user_id_idx ON knowledge_base (user_id)`,
  `CREATE INDEX IF NOT EXISTS knowledge_base_file_type_idx ON knowledge_base (file_type)`,
  `CREATE INDEX IF NOT EXISTS knowledge_base_updated_at_idx ON knowledge_base (updated_at)`,
  
  // Analytics indexes
  `CREATE INDEX IF NOT EXISTS analytics_user_id_idx ON analytics (user_id)`,
  `CREATE INDEX IF NOT EXISTS analytics_date_idx ON analytics (date)`,
  `CREATE INDEX IF NOT EXISTS analytics_user_date_idx ON analytics (user_id, date)`,
];

// Add analyze queries to update statistics for the query planner
const ANALYZE_QUERIES = [
  `ANALYZE users`,
  `ANALYZE platforms`,
  `ANALYZE conversations`,
  `ANALYZE messages`,
  `ANALYZE knowledge_base`,
  `ANALYZE analytics`,
];

async function runDatabaseOptimizations() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable not set");
      process.exit(1);
    }
    
    console.log("🔍 Starting database optimization process...");
    
    // Connect to PostgreSQL
    const sql = postgres(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Apply all indexes
    console.log("📊 Adding database indexes for performance optimization...");
    
    for (const query of INDEXING_QUERIES) {
      console.log(`  - Executing: ${query}`);
      await sql.unsafe(query);
    }
    
    // Update the statistics for the PostgreSQL query planner
    console.log("🔄 Updating database statistics...");
    
    for (const query of ANALYZE_QUERIES) {
      console.log(`  - Executing: ${query}`);
      await sql.unsafe(query);
    }
    
    console.log("✅ Database optimization completed successfully!");
    console.log("💡 Your queries should now be faster with optimized indexes.");
    
    // Cleanup connection
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database optimization failed:", error);
    process.exit(1);
  }
}

// Run the optimizations
runDatabaseOptimizations();