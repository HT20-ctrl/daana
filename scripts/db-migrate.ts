/**
 * Comprehensive Database Migration Tool
 * 
 * This script provides a complete migration strategy without requiring package.json changes.
 * 
 * Usage:
 *   npx tsx scripts/db-migrate.ts generate <name>  - Generate a new migration
 *   npx tsx scripts/db-migrate.ts apply            - Apply pending migrations
 *   npx tsx scripts/db-migrate.ts status           - Show migration status
 *   npx tsx scripts/db-migrate.ts check            - Check for drift between schema and database
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

// Promisify exec
const execAsync = promisify(exec);

// Migration directories
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const APPLIED_DIR = path.join(MIGRATIONS_DIR, 'applied');

// Ensure directories exist
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

if (!fs.existsSync(APPLIED_DIR)) {
  fs.mkdirSync(APPLIED_DIR, { recursive: true });
}

/**
 * Generate a new migration based on current schema changes
 */
async function generateMigration(name: string) {
  try {
    if (!name) {
      console.error('Error: Migration name is required');
      console.log('Usage: npx tsx scripts/db-migrate.ts generate <name>');
      process.exit(1);
    }

    // Create safe name for migration
    const safeName = name.toLowerCase().replace(/\s+/g, '_');
    
    // Create timestamp for the migration
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '')
      .slice(0, 14);
    
    const fullMigrationName = `${timestamp}_${safeName}`;
    const migrationDir = path.join(MIGRATIONS_DIR, fullMigrationName);
    
    // Create directory for migration
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }
    
    console.log(`Generating migration: ${fullMigrationName}...`);
    
    // Generate the migration files
    await execAsync(`npx drizzle-kit generate:pg --out=./migrations/${fullMigrationName} --schema=./shared/schema.ts`);
    
    // Create metadata file
    const metadataFile = path.join(migrationDir, 'meta.json');
    fs.writeFileSync(
      metadataFile,
      JSON.stringify({
        name: safeName,
        created_at: new Date().toISOString(),
        description: `Migration for ${safeName}`
      }, null, 2)
    );
    
    console.log(`✅ Migration ${fullMigrationName} generated successfully!`);
    console.log(`To apply this migration, run: npx tsx scripts/db-migrate.ts apply`);
    
  } catch (error) {
    console.error('Failed to generate migration:', error);
    process.exit(1);
  }
}

/**
 * Apply pending migrations to the database
 */
async function applyMigrations() {
  try {
    console.log('📦 Applying database migrations...');
    
    // Get list of migration directories
    const allItems = fs.readdirSync(MIGRATIONS_DIR);
    const migrationDirectories = allItems.filter(item => {
      const itemPath = path.join(MIGRATIONS_DIR, item);
      return fs.statSync(itemPath).isDirectory() && item !== 'applied';
    });
    
    // Sort migrations by timestamp
    migrationDirectories.sort((a, b) => {
      const timestampA = a.split('_')[0];
      const timestampB = b.split('_')[0];
      return timestampA.localeCompare(timestampB);
    });
    
    if (migrationDirectories.length === 0) {
      console.log('✅ No pending migrations to apply.');
      return;
    }
    
    console.log(`Found ${migrationDirectories.length} migrations to apply:`);
    migrationDirectories.forEach(dir => console.log(`  - ${dir}`));
    
    // Apply migrations
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    
    // Record applied migrations
    const timestamp = new Date().toISOString();
    migrationDirectories.forEach(dir => {
      const appliedFile = path.join(APPLIED_DIR, `${dir}.json`);
      fs.writeFileSync(
        appliedFile,
        JSON.stringify({
          name: dir,
          applied_at: timestamp,
          status: 'success'
        }, null, 2)
      );
    });
    
    console.log('✅ Migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Check schema against the database and report drift
 */
async function checkMigrations() {
  try {
    console.log('🔍 Checking for schema drift...');
    
    // Use drizzle-kit check to compare schema with database
    execSync('npx drizzle-kit check:pg', { stdio: 'inherit' });
    
    console.log('✅ Schema check completed!');
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  }
}

/**
 * Display migration status
 */
async function showStatus() {
  try {
    console.log('📊 Migration Status:');
    
    // Get list of all migrations
    const allItems = fs.readdirSync(MIGRATIONS_DIR);
    const migrationDirectories = allItems.filter(item => {
      const itemPath = path.join(MIGRATIONS_DIR, item);
      return fs.statSync(itemPath).isDirectory() && item !== 'applied';
    });
    
    // Get list of applied migrations
    const appliedMigrations = fs.existsSync(APPLIED_DIR) 
      ? fs.readdirSync(APPLIED_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
      : [];
    
    // Sort migrations by timestamp
    migrationDirectories.sort((a, b) => {
      const timestampA = a.split('_')[0];
      const timestampB = b.split('_')[0];
      return timestampA.localeCompare(timestampB);
    });
    
    if (migrationDirectories.length === 0) {
      console.log('No migrations found.');
      return;
    }
    
    console.log('Available migrations:');
    migrationDirectories.forEach(dir => {
      const isApplied = appliedMigrations.includes(dir);
      const status = isApplied ? '✅ Applied' : '⏳ Pending';
      
      // If applied, get the timestamp
      let appliedAt = '';
      if (isApplied) {
        try {
          const metadataPath = path.join(APPLIED_DIR, `${dir}.json`);
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          appliedAt = metadata.applied_at ? ` (applied at ${new Date(metadata.applied_at).toLocaleString()})` : '';
        } catch (error) {
          // Ignore errors reading metadata
        }
      }
      
      console.log(`  - ${dir}: ${status}${appliedAt}`);
    });
    
    // Check for schema drift
    console.log('\nChecking for schema drift:');
    try {
      const { stdout } = await execAsync('npx drizzle-kit check:pg');
      if (stdout.includes('No schema drift detected')) {
        console.log('✅ No schema drift detected');
      } else {
        console.log('⚠️ Schema drift detected! Run npx tsx scripts/db-migrate.ts check for details.');
      }
    } catch (error) {
      console.log('⚠️ Schema drift check failed. Run npx tsx scripts/db-migrate.ts check for details.');
    }
    
  } catch (error) {
    console.error('❌ Failed to show migration status:', error);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Database Migration Tool
=======================

This script provides a complete migration strategy for managing database schema changes.

Usage:
  npx tsx scripts/db-migrate.ts <command> [arguments]

Commands:
  generate <name>   - Generate a new migration with the specified name
  apply             - Apply all pending migrations
  status            - Show migration status
  check             - Check for drift between schema and database
  help              - Show this help information

Examples:
  npx tsx scripts/db-migrate.ts generate add_user_roles
  npx tsx scripts/db-migrate.ts apply
  npx tsx scripts/db-migrate.ts status
  `);
}

// Main function to process command line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  switch (command) {
    case 'generate':
      await generateMigration(args[1]);
      break;
      
    case 'apply':
      await applyMigrations();
      break;
      
    case 'check':
      await checkMigrations();
      break;
      
    case 'status':
      await showStatus();
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Run the main function
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}