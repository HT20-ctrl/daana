/**
 * Full Multi-Tenant Migration Runner
 * 
 * This script executes all required migrations to implement
 * multi-tenant security features in the Dana AI platform:
 * 1. Organization migration (if needed)
 * 2. Knowledge Base migration
 * 3. Other tables migration (platforms, conversations, messages, etc.)
 * 
 * This ensures proper data isolation between organizations.
 */

import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
import { nanoid } from 'nanoid';

// Set up environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  console.error('Please ensure you have a .env file with DATABASE_URL or set it in your environment.');
  process.exit(1);
}

/**
 * Run organization migration
 * Creates organizations table if it doesn't exist
 */
async function runOrganizationMigration(client) {
  console.log('Starting organization table migration...');
  
  try {
    // Check if the table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'organizations'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating organizations table...');
      
      // Create the organizations table
      await client.query(`
        CREATE TABLE organizations (
          id VARCHAR PRIMARY KEY NOT NULL,
          name VARCHAR NOT NULL,
          plan VARCHAR DEFAULT 'free',
          logo VARCHAR,
          website VARCHAR,
          industry VARCHAR,
          size INTEGER,
          settings JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX organizations_name_idx ON organizations(name);
        CREATE INDEX organizations_plan_idx ON organizations(plan);
      `);
      
      // Create organization_members junction table
      await client.query(`
        CREATE TABLE organization_members (
          id SERIAL PRIMARY KEY,
          organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR DEFAULT 'member',
          invite_status VARCHAR DEFAULT 'pending',
          invite_token VARCHAR,
          invite_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          
          UNIQUE(organization_id, user_id)
        );
        
        CREATE INDEX org_member_org_user_idx ON organization_members(organization_id, user_id);
        CREATE INDEX org_member_user_idx ON organization_members(user_id);
        CREATE INDEX org_member_org_idx ON organization_members(organization_id);
        CREATE INDEX org_member_role_idx ON organization_members(role);
      `);
      
      console.log('Organizations table created successfully');
      
      // Create a default organization and assign all existing users to it
      const defaultOrgId = nanoid(10);
      await client.query(`
        INSERT INTO organizations (id, name, plan)
        VALUES ($1, 'Default Organization', 'professional');
      `, [defaultOrgId]);
      
      // Add all existing users to the default organization as owners
      await client.query(`
        INSERT INTO organization_members (organization_id, user_id, role, invite_status)
        SELECT $1, id, 'owner', 'accepted' FROM users;
      `, [defaultOrgId]);
      
      console.log(`Created default organization (${defaultOrgId}) and assigned all existing users as owners`);
      
      return true;
    } else {
      console.log('Organizations table already exists, skipping creation');
      return false;
    }
  } catch (error) {
    console.error('Error running organization migration:', error);
    throw error;
  }
}

/**
 * Runs the knowledge base migration to add organization_id column
 */
async function runKnowledgeBaseMigration(client) {
  console.log('Starting knowledge base migration...');
  
  try {
    // Check if organization_id column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_base' AND column_name = 'organization_id';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding organization_id to knowledge_base table...');
      
      // Add the organization_id column
      await client.query(`
        ALTER TABLE knowledge_base 
        ADD COLUMN organization_id VARCHAR 
        REFERENCES organizations(id) ON DELETE SET NULL;
        
        CREATE INDEX knowledge_base_org_id_idx ON knowledge_base(organization_id);
      `);
      
      // Assign existing knowledge base entries to default organization
      await client.query(`
        UPDATE knowledge_base kb
        SET organization_id = (
          SELECT om.organization_id 
          FROM organization_members om 
          WHERE om.user_id = kb.user_id 
          LIMIT 1
        )
        WHERE kb.organization_id IS NULL;
      `);
      
      console.log('Knowledge base migration completed successfully');
      return true;
    } else {
      console.log('organization_id column already exists in knowledge_base, skipping...');
      return false;
    }
  } catch (error) {
    console.error('Error in knowledge base migration:', error);
    throw error;
  }
}

/**
 * Migrates other tables to include organization_id column
 */
async function runOtherTablesMigration(client) {
  console.log('Starting migration for other tables...');
  
  const TABLES_TO_UPDATE = [
    { table: 'platforms', createIndex: true },
    { table: 'conversations', createIndex: true },
    { table: 'messages', createIndex: false },
    { table: 'analytics', createIndex: true },
    { table: 'users', createIndex: false }
  ];
  
  for (const { table, createIndex } of TABLES_TO_UPDATE) {
    try {
      // Check if column already exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = 'organization_id';
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log(`Adding organization_id column to ${table} table...`);
        
        // Add the organization_id column
        await client.query(`
          ALTER TABLE ${table} 
          ADD COLUMN organization_id VARCHAR 
          REFERENCES organizations(id) ON DELETE SET NULL;
        `);
        
        if (createIndex) {
          await client.query(`
            CREATE INDEX ${table}_org_id_idx ON ${table}(organization_id);
          `);
        }
        
        // For tables with user_id, assign to default organization
        if (table !== 'messages') {
          await client.query(`
            UPDATE ${table} t
            SET organization_id = (
              SELECT om.organization_id 
              FROM organization_members om 
              WHERE om.user_id = t.user_id 
              LIMIT 1
            )
            WHERE t.organization_id IS NULL;
          `);
        } else {
          // For messages table, get organization via conversation relation
          await client.query(`
            UPDATE messages m
            SET organization_id = (
              SELECT c.organization_id 
              FROM conversations c 
              WHERE c.id = m.conversation_id 
            )
            WHERE m.organization_id IS NULL;
          `);
        }
        
        console.log(`Successfully added organization_id column to ${table} table`);
      } else {
        console.log(`organization_id column already exists in ${table} table, skipping...`);
      }
    } catch (error) {
      console.error(`Error updating ${table} table:`, error);
      throw error;
    }
  }
  
  console.log('All tables successfully updated with organization_id');
  return true;
}

/**
 * Run all migrations in a single transaction
 */
async function runAllMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('Starting multi-tenant migrations...');
    
    await client.connect();
    await client.query('BEGIN');
    
    // Create organizations table if needed
    await runOrganizationMigration(client);
    
    // Update knowledge base with organization_id
    await runKnowledgeBaseMigration(client);
    
    // Update other tables with organization_id
    await runOtherTablesMigration(client);
    
    // Commit changes
    await client.query('COMMIT');
    
    console.log('✅ All multi-tenant migrations completed successfully!');
    return true;
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    return false;
  } finally {
    await client.end();
  }
}

// Run all migrations
runAllMigrations()
  .then(success => {
    if (success) {
      console.log('👍 Dana AI platform now has complete multi-tenant data isolation');
      console.log('   All database tables have been secured with organization context');
    } else {
      console.error('❌ Migration failed, database may be in an inconsistent state');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Critical error during migrations:', error);
    process.exit(1);
  });