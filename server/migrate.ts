import { db } from "./db";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure the Neon database connection
neonConfig.webSocketConstructor = ws;

/**
 * Run database migrations
 */
async function main() {
  console.log("Starting database migrations...");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  
  try {
    // Create a separate connection pool for migrations
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const migrationDb = drizzle(pool);
    
    // Run the migrations
    console.log("Running migrations...");
    await migrate(migrationDb, { migrationsFolder: "./drizzle" });
    
    // Close the pool
    await pool.end();
    
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

/**
 * Generate initial schema on first run
 */
async function generateInitialSchema() {
  console.log("Generating initial schema...");
  
  try {
    // Try to create sessions table first (needed for Replit Auth)
    await db.execute`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `;
    
    await db.execute`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)
    `;
    
    // Create enum types if they don't exist
    await db.execute`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_type') THEN
          CREATE TYPE conversation_type AS ENUM ('direct', 'group', 'channel', 'support', 'sales');
        END IF;
      END
      $$;
    `;
    
    await db.execute`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_status') THEN
          CREATE TYPE conversation_status AS ENUM ('active', 'pending', 'closed', 'archived');
        END IF;
      END
      $$;
    `;
    
    await db.execute`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
          CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed', 'pending');
        END IF;
      END
      $$;
    `;
    
    await db.execute`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'knowledge_base_category') THEN
          CREATE TYPE knowledge_base_category AS ENUM ('policies', 'procedures', 'products', 'services', 'faqs', 'troubleshooting', 'other');
        END IF;
      END
      $$;
    `;
    
    // Create users table if it doesn't exist
    await db.execute`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        profile_image_url VARCHAR(255),
        role VARCHAR(255) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create platforms table if it doesn't exist
    await db.execute`
      CREATE TABLE IF NOT EXISTS platforms (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        is_connected BOOLEAN DEFAULT FALSE,
        settings JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create conversations table if it doesn't exist
    await db.execute`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        platform_id INTEGER REFERENCES platforms(id),
        customer_name VARCHAR(255) NOT NULL,
        customer_avatar VARCHAR(255),
        last_message TEXT,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        status conversation_status DEFAULT 'active',
        assigned_to_user_id VARCHAR(255) REFERENCES users(id),
        external_id VARCHAR(255),
        conversation_type conversation_type DEFAULT 'direct',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create messages table if it doesn't exist
    await db.execute`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) NOT NULL,
        content TEXT NOT NULL,
        is_from_customer BOOLEAN NOT NULL,
        is_ai_generated BOOLEAN DEFAULT FALSE,
        status message_status DEFAULT 'sent',
        external_id VARCHAR(255),
        sentiment INTEGER,
        attachments JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create knowledge_base table if it doesn't exist
    await db.execute`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        file_path VARCHAR(255),
        title VARCHAR(255),
        description TEXT,
        category knowledge_base_category DEFAULT 'other',
        content TEXT,
        keywords TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create analytics table if it doesn't exist
    await db.execute`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
        total_messages INTEGER DEFAULT 0,
        ai_responses INTEGER DEFAULT 0,
        manual_responses INTEGER DEFAULT 0,
        sentiment_score INTEGER DEFAULT 0,
        response_time INTEGER,
        resolved_conversations INTEGER DEFAULT 0,
        escalated_conversations INTEGER DEFAULT 0,
        platform_breakdown JSONB,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log("Initial schema generated successfully");
  } catch (error) {
    console.error("Failed to generate initial schema:", error);
    process.exit(1);
  }
}

// Check if we should run migrations or generate initial schema
async function checkAndSetupDatabase() {
  try {
    // Try to check if users table exists
    const result = await db.execute`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    
    const tableExists = result.rows[0]?.exists === true;
    
    if (!tableExists) {
      // Database is empty or tables don't exist
      await generateInitialSchema();
    } else {
      console.log("Database schema already exists");
    }
  } catch (error) {
    console.error("Error checking database state:", error);
    
    // Attempt to create schema anyway
    await generateInitialSchema();
  }
}

// Run the setup
async function setup() {
  await checkAndSetupDatabase();
  console.log("Database setup complete");
}

// Run the setup if executed directly
if (require.main === module) {
  setup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Database setup failed:", err);
      process.exit(1);
    });
}

export { setup, main as migrate };