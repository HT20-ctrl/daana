/**
 * Migration Generator Script
 * 
 * This script creates a new migration file to track schema changes.
 * Usage: npm run db:generate <migration-name>
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Get migration name from command line argument
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Error: Migration name is required');
  console.log('Usage: npm run db:generate <migration-name>');
  process.exit(1);
}

const migrationName = args[0].toLowerCase().replace(/\s+/g, '_');

// Create timestamp for the migration
const timestamp = new Date().toISOString()
  .replace(/[-:]/g, '')
  .replace('T', '')
  .slice(0, 14);

const fullMigrationName = `${timestamp}_${migrationName}`;

// Ensure migrations directory exists
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

// Use drizzle-kit to generate the migration
try {
  console.log(`Generating migration: ${fullMigrationName}...`);
  
  execSync(`npx drizzle-kit generate --out=./migrations/${fullMigrationName}`, { 
    stdio: 'inherit' 
  });
  
  // Create metadata file for the migration
  const metadataFile = path.join(MIGRATIONS_DIR, `${fullMigrationName}.json`);
  fs.writeFileSync(
    metadataFile,
    JSON.stringify({
      name: migrationName,
      created_at: new Date().toISOString(),
      description: `Migration for ${migrationName}`
    }, null, 2)
  );
  
  console.log(`✅ Migration ${fullMigrationName} generated successfully!`);
  console.log(`To apply this migration, run: npm run db:migrate`);
  
} catch (error) {
  console.error('Failed to generate migration:', error);
  process.exit(1);
}