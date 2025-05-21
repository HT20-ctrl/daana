/**
 * Database Migration Runner
 * 
 * This script performs database migrations using Drizzle ORM.
 * It supports both generating migration files and applying them to the database.
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';
import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Migration directories
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const APPLIED_MIGRATIONS_DIR = path.join(MIGRATIONS_DIR, 'applied');

// Ensure migration directories exist
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

if (!fs.existsSync(APPLIED_MIGRATIONS_DIR)) {
  fs.mkdirSync(APPLIED_MIGRATIONS_DIR, { recursive: true });
}

/**
 * Generate migration files using drizzle-kit
 */
async function generateMigrations() {
  try {
    console.log('Generating migration files...');
    const { stdout, stderr } = await execAsync('npx drizzle-kit generate');
    
    if (stderr) {
      console.error('Error generating migrations:', stderr);
      return false;
    }
    
    console.log(stdout);
    console.log('Migration files generated successfully!');
    return true;
  } catch (error) {
    console.error('Failed to generate migrations:', error);
    return false;
  }
}

/**
 * Run pending migrations
 */
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Apply migrations using drizzle ORM
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    
    console.log('Migrations completed successfully!');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

/**
 * Create and apply a migration for the current schema changes
 */
async function createAndApplyMigration(migrationName: string) {
  try {
    // Create a timestamp for the migration
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').slice(0, 14);
    const fullMigrationName = `${timestamp}_${migrationName}`;
    
    console.log(`Creating migration: ${fullMigrationName}`);
    
    // Generate the migration
    const migrationSuccess = await generateMigrations();
    if (!migrationSuccess) {
      throw new Error('Failed to generate migration files');
    }
    
    // Run the migrations
    const runSuccess = await runMigrations();
    if (!runSuccess) {
      throw new Error('Failed to apply migrations');
    }
    
    // Archive the migration
    const archiveSuccess = archiveAppliedMigration(fullMigrationName);
    if (!archiveSuccess) {
      console.warn('Warning: Could not archive migration, but it was applied successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Migration creation and application failed:', error);
    return false;
  }
}

/**
 * Archive a migration after it's been applied
 */
function archiveAppliedMigration(migrationName: string): boolean {
  try {
    const archiveFilePath = path.join(APPLIED_MIGRATIONS_DIR, `${migrationName}.json`);
    
    // Create a record of the applied migration
    const migrationRecord = {
      name: migrationName,
      appliedAt: new Date().toISOString(),
      schema: Object.keys(schema)
    };
    
    fs.writeFileSync(
      archiveFilePath,
      JSON.stringify(migrationRecord, null, 2)
    );
    
    console.log(`Migration archived: ${migrationName}`);
    return true;
  } catch (error) {
    console.error('Failed to archive migration:', error);
    return false;
  }
}

/**
 * Run the migration process based on command line arguments
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'generate':
      await generateMigrations();
      break;
    
    case 'run':
      await runMigrations();
      break;
    
    case 'create-and-run':
      if (args.length < 2) {
        console.error('Migration name is required. Usage: npm run migrate create-and-run <migration-name>');
        process.exit(1);
      }
      
      const migrationName = args[1];
      await createAndApplyMigration(migrationName);
      break;
    
    default:
      console.log(`
Migration CLI Usage:
  npm run migrate generate          - Generate migration files from schema changes
  npm run migrate run               - Run pending migrations
  npm run migrate create-and-run <name> - Create and apply a migration with the given name
      `);
      break;
  }
}

// Execute the main function
if (require.main === module) {
  main().then(() => {
    console.log('Migration process completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
}

export { generateMigrations, runMigrations, createAndApplyMigration };