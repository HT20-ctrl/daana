/**
 * Database Migration Script
 * 
 * This script runs the SQL migration to create the necessary tables for organizations
 * and multi-tenant functionality in the Dana AI platform.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Client } = pg;

// For ES Modules dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for database connection string
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create a new PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrate-organizations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    
    // Execute the migration SQL
    await client.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
    // Get the list of tables to verify
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\nVerifying database tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the migration
runMigration();