/**
 * Knowledge Base Migration Runner
 * 
 * This script executes the migration to add organization_id column
 * to the knowledge_base table, supporting multi-tenant data isolation
 */

const { runMigration } = require('./migrate-knowledge-base');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  console.error('Please ensure you have a .env file with DATABASE_URL or set it in your environment.');
  process.exit(1);
}

// Execute migration
runMigration()
  .then(() => {
    console.log('✅ Knowledge base multi-tenant migration completed successfully!');
    console.log('The knowledge_base table now supports organization-level data segregation.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Knowledge base migration failed:', error.message);
    console.error('Please check the database connection and try again.');
    process.exit(1);
  });