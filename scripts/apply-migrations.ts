/**
 * Database Migration Application Script
 * 
 * This script applies pending migrations to the database.
 * Usage: npm run db:migrate
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';
import fs from 'fs';
import path from 'path';

// Define migration directories
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const APPLIED_DIR = path.join(MIGRATIONS_DIR, 'applied');

// Ensure applied migrations directory exists
if (!fs.existsSync(APPLIED_DIR)) {
  fs.mkdirSync(APPLIED_DIR, { recursive: true });
}

async function applyMigrations() {
  try {
    console.log('📦 Applying database migrations...');
    
    // Get list of migration directories (exclude metadata files and applied directory)
    const migrationDirectories = fs.readdirSync(MIGRATIONS_DIR)
      .filter(item => {
        const itemPath = path.join(MIGRATIONS_DIR, item);
        return fs.statSync(itemPath).isDirectory() && item !== 'applied';
      });
    
    // Sort migrations by timestamp (assuming format: YYYYMMDDHHMMSS_name)
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

// Run migrations
applyMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  });