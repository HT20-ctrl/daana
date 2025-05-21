/**
 * Full Multi-Tenant Migration Runner
 * 
 * This script executes all required migrations to implement
 * multi-tenant security features in the Dana AI platform:
 * 1. Organization migration (if needed)
 * 2. Knowledge Base migration
 * 
 * This ensures proper data isolation between organizations.
 */

import { runMigration as runKnowledgeBaseMigration } from './migrate-knowledge-base.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

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
async function runOrganizationMigration() {
  console.log('🔄 Starting organization migration...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if organizations table exists
    const checkTableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'organizations'
    `);
    
    if (checkTableResult.rows.length === 0) {
      console.log('Creating organizations table...');
      
      // Create organizations table
      await client.query(`
        CREATE TABLE organizations (
          id VARCHAR PRIMARY KEY,
          name VARCHAR NOT NULL,
          owner_id VARCHAR NOT NULL,
          plan VARCHAR,
          logo VARCHAR,
          website VARCHAR,
          industry VARCHAR,
          size INTEGER,
          settings JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create organization_members table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_members (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL,
          organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          role VARCHAR,
          invite_status VARCHAR,
          invite_token VARCHAR,
          invite_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Add indexes
      await client.query(`CREATE INDEX IF NOT EXISTS org_members_user_idx ON organization_members(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS org_members_org_idx ON organization_members(organization_id)`);
      
      console.log('Successfully created organizations tables with indexes');
    } else {
      console.log('Organizations table already exists, skipping...');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Organization tables migration completed successfully');
    return true;
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('❌ Organization migration failed:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Execute migrations in sequence
async function runAllMigrations() {
  try {
    console.log('🚀 Starting multi-tenant migration suite...');
    
    // Step 1: Run Organization migration
    const orgMigrationSuccess = await runOrganizationMigration();
    if (!orgMigrationSuccess) {
      throw new Error('Organization migration failed. Aborting remaining migrations.');
    }
    
    // Step 2: Run Knowledge Base migration
    await runKnowledgeBaseMigration();
    
    console.log('✅ All migrations completed successfully!');
    console.log('The Dana AI platform now supports full multi-tenant data isolation.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration suite failed:', error.message);
    console.error('Please fix the issues and try again.');
    process.exit(1);
  }
}

// Execute the migration suite
runAllMigrations();