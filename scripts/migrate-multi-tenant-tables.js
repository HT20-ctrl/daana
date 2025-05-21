/**
 * Multi-Tenant Database Migration
 * 
 * This script adds organization_id columns to all relevant tables
 * to ensure consistent multi-tenant data isolation across the
 * entire Dana AI platform.
 */

import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';

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
 * List of tables to update with organization_id column
 * Each entry consists of the table name and whether to create an index
 */
const TABLES_TO_UPDATE = [
  { table: 'platforms', createIndex: true },
  { table: 'conversations', createIndex: true },
  { table: 'messages', createIndex: false }, // No direct index needed, we query by conversation
  { table: 'analytics', createIndex: true },
  // knowledge_base is already updated in separate migration
  { table: 'users', createIndex: false } // Special case, will handle differently
];

/**
 * Add organization_id column to a specified table
 */
async function addOrganizationIdToTable(client, table, createIndex) {
  try {
    // Check if the column already exists
    const checkColumnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${table}' AND column_name = 'organization_id'
    `);
    
    if (checkColumnResult.rows.length === 0) {
      console.log(`Adding organization_id column to ${table} table...`);
      
      // Add the organization_id column with reference to organizations table
      await client.query(`
        ALTER TABLE ${table} 
        ADD COLUMN organization_id VARCHAR 
        REFERENCES organizations(id) ON DELETE SET NULL
      `);
      
      // Create index on organization_id for faster lookups if requested
      if (createIndex) {
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${table}_org_id_idx 
          ON ${table}(organization_id)
        `);
      }
      
      console.log(`Successfully added organization_id column to ${table} table`);
      return true;
    } else {
      console.log(`organization_id column already exists in ${table} table, skipping...`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating ${table} table:`, error);
    throw error;
  }
}

/**
 * Run the multi-tenant migration for all relevant tables
 */
async function runMultiTenantMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Starting multi-tenant table migration...');
    
    await client.connect();
    
    // Begin transaction - ensures all changes are applied or none
    await client.query('BEGIN');
    
    // Update each table in the list
    for (const { table, createIndex } of TABLES_TO_UPDATE) {
      await addOrganizationIdToTable(client, table, createIndex);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Multi-tenant table migration completed successfully');
    return true;
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    return false;
  } finally {
    await client.end();
  }
}

// Run the migration
runMultiTenantMigration()
  .then(success => {
    if (success) {
      console.log('✅ All tables have been successfully updated with organization_id!');
      console.log('The Dana AI platform now has complete multi-tenant data isolation.');
    } else {
      console.error('❌ Migration completed with errors.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Migration failed with critical error:', error);
    process.exit(1);
  });