/**
 * Knowledge Base Multi-tenant Migration Script
 * 
 * This script adds the organization_id column to the knowledge_base table,
 * sets up appropriate indexes, and establishes a foreign key constraint.
 * This migration is part of the multi-tenant security implementation.
 */

const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Starting knowledge base multi-tenant migration...');
    
    await client.connect();
    
    // Begin transaction - ensures all changes are applied or none
    await client.query('BEGIN');
    
    // Check if the column already exists
    const checkColumnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_base' AND column_name = 'organization_id'
    `);
    
    if (checkColumnResult.rows.length === 0) {
      console.log('Adding organization_id column to knowledge_base table...');
      
      // Add the organization_id column with reference to organizations table
      await client.query(`
        ALTER TABLE knowledge_base 
        ADD COLUMN organization_id VARCHAR 
        REFERENCES organizations(id) ON DELETE SET NULL
      `);
      
      // Create index on organization_id for faster lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS knowledge_base_org_id_idx 
        ON knowledge_base(organization_id)
      `);
      
      // Create compound index for user+organization lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS knowledge_base_user_org_idx 
        ON knowledge_base(user_id, organization_id)
      `);
      
      console.log('Successfully added organization_id column with indexes');
    } else {
      console.log('organization_id column already exists, skipping...');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Knowledge base multi-tenant migration completed successfully');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script executed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };