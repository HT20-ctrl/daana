import pg from 'pg';
const { Pool } = pg;

// Configure database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  console.log("Starting database schema update...");

  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Add missing columns to platforms table
    console.log("Updating platforms table...");
    await client.query(`
      ALTER TABLE platforms 
      ADD COLUMN IF NOT EXISTS settings JSONB,
      ADD COLUMN IF NOT EXISTS metadata JSONB
    `);

    // Add enum types if they don't exist
    console.log("Creating enum types...");
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_type') THEN
          CREATE TYPE conversation_type AS ENUM ('direct', 'group', 'channel', 'support', 'sales');
        END IF;
      END
      $$;
    `);
    
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_status') THEN
          CREATE TYPE conversation_status AS ENUM ('active', 'pending', 'closed', 'archived');
        END IF;
      END
      $$;
    `);
    
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
          CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed', 'pending');
        END IF;
      END
      $$;
    `);
    
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'knowledge_base_category') THEN
          CREATE TYPE knowledge_base_category AS ENUM ('policies', 'procedures', 'products', 'services', 'faqs', 'troubleshooting', 'other');
        END IF;
      END
      $$;
    `);

    // Update conversations table
    console.log("Updating conversations table...");
    await client.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS status conversation_status DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS assigned_to_user_id VARCHAR(255) REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS conversation_type conversation_type DEFAULT 'direct',
      ADD COLUMN IF NOT EXISTS metadata JSONB
    `);

    // Update messages table
    console.log("Updating messages table...");
    await client.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS status message_status DEFAULT 'sent',
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS sentiment INTEGER,
      ADD COLUMN IF NOT EXISTS attachments JSONB,
      ADD COLUMN IF NOT EXISTS metadata JSONB,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Update knowledge_base table
    console.log("Updating knowledge_base table...");
    await client.query(`
      ALTER TABLE knowledge_base
      ADD COLUMN IF NOT EXISTS file_path VARCHAR(255),
      ADD COLUMN IF NOT EXISTS title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS category knowledge_base_category DEFAULT 'other',
      ADD COLUMN IF NOT EXISTS keywords TEXT[]
    `);

    // Update analytics table
    console.log("Updating analytics table...");
    await client.query(`
      ALTER TABLE analytics
      ADD COLUMN IF NOT EXISTS response_time INTEGER,
      ADD COLUMN IF NOT EXISTS resolved_conversations INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS escalated_conversations INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS platform_breakdown JSONB
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log("Database schema update completed successfully");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration directly
runMigration()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });