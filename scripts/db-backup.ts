/**
 * Database Backup Utility
 * 
 * This script provides functionality to back up and restore the PostgreSQL database.
 * It supports full database backups, scheduled backups, and restoration from backups.
 * 
 * Usage:
 *   npx tsx scripts/db-backup.ts backup                  - Create a full database backup
 *   npx tsx scripts/db-backup.ts schedule                - Setup scheduled backups
 *   npx tsx scripts/db-backup.ts restore <backup-file>   - Restore from a backup file
 *   npx tsx scripts/db-backup.ts list                    - List available backups
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

// Promisify exec
const execAsync = promisify(exec);

// Configuration
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 10; // Maximum number of backups to keep

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a full database backup
 */
async function createBackup() {
  try {
    // Create timestamp for the backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `dana-ai-backup-${timestamp}.sql`);

    console.log(`Creating database backup: ${backupFile}`);

    // Extract connection details from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Parse DATABASE_URL
    const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }

    const [, user, password, host, port, database] = match;

    // Set environment variables for pg_dump
    const env = {
      ...process.env,
      PGUSER: user,
      PGPASSWORD: password,
      PGHOST: host,
      PGPORT: port,
      PGDATABASE: database
    };

    // Execute pg_dump command
    const { stdout, stderr } = await execAsync('pg_dump --format=plain --clean --if-exists', { env });

    // Save the backup to file
    fs.writeFileSync(backupFile, stdout);

    console.log(`✅ Backup completed successfully: ${backupFile}`);
    console.log(`Backup size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Clean up old backups
    cleanupOldBackups();

    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return null;
  }
}

/**
 * Restore database from a backup file
 */
async function restoreFromBackup(backupFile: string) {
  try {
    if (!backupFile) {
      const backups = getAvailableBackups();
      if (backups.length === 0) {
        console.error('No backup files found.');
        return false;
      }
      
      // Use the most recent backup if none specified
      backupFile = backups[0].path;
      console.log(`Using most recent backup: ${backupFile}`);
    } else if (!fs.existsSync(backupFile)) {
      // Check if it's a relative path within the backup directory
      const potentialPath = path.join(BACKUP_DIR, backupFile);
      if (fs.existsSync(potentialPath)) {
        backupFile = potentialPath;
      } else {
        console.error(`Backup file not found: ${backupFile}`);
        return false;
      }
    }

    // Confirm before proceeding
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmation = await new Promise<boolean>((resolve) => {
      rl.question(`⚠️ WARNING: This will overwrite the current database with backup from ${backupFile}. Continue? (y/N) `, (answer) => {
        resolve(answer.toLowerCase() === 'y');
        rl.close();
      });
    });

    if (!confirmation) {
      console.log('Restore cancelled.');
      return false;
    }

    console.log(`Restoring database from backup: ${backupFile}`);

    // Extract connection details from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Parse DATABASE_URL
    const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }

    const [, user, password, host, port, database] = match;

    // Set environment variables for psql
    const env = {
      ...process.env,
      PGUSER: user,
      PGPASSWORD: password,
      PGHOST: host,
      PGPORT: port,
      PGDATABASE: database
    };

    // Read backup file
    const backupContent = fs.readFileSync(backupFile, 'utf8');

    // Create a temporary file for the SQL commands
    const tempFile = path.join(BACKUP_DIR, 'temp-restore.sql');
    fs.writeFileSync(tempFile, backupContent);

    // Execute the backup restore using the file
    await execAsync(`psql -f "${tempFile}"`, { env });
    
    // Clean up temporary file
    fs.unlinkSync(tempFile);

    console.log('✅ Database restoration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Restore failed:', error);
    return false;
  }
}

/**
 * List available backups
 */
function getAvailableBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime
        };
      });

    // Sort by creation date (newest first)
    files.sort((a, b) => b.created.getTime() - a.created.getTime());
    
    return files;
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

/**
 * Display list of available backups
 */
function listBackups() {
  const backups = getAvailableBackups();
  
  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }
  
  console.log('Available backups:');
  backups.forEach((backup, index) => {
    const sizeInMB = (backup.size / 1024 / 1024).toFixed(2);
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   Created: ${backup.created.toLocaleString()}`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Path: ${backup.path}`);
    console.log('');
  });

  console.log(`Total backups: ${backups.length}`);
}

/**
 * Delete old backups to maintain the maximum number of backups
 */
function cleanupOldBackups() {
  const backups = getAvailableBackups();
  
  if (backups.length <= MAX_BACKUPS) {
    return;
  }
  
  console.log(`Cleaning up old backups (keeping ${MAX_BACKUPS} most recent)...`);
  
  // Delete oldest backups beyond the maximum limit
  const backupsToDelete = backups.slice(MAX_BACKUPS);
  backupsToDelete.forEach(backup => {
    try {
      fs.unlinkSync(backup.path);
      console.log(`Deleted old backup: ${backup.name}`);
    } catch (error) {
      console.error(`Failed to delete backup ${backup.name}:`, error);
    }
  });
}

/**
 * Set up scheduled backups
 */
async function setupScheduledBackups() {
  console.log('Scheduled backups require adding a cron job to your system.');
  console.log('Here\'s how to set up a daily backup at 2 AM using cron:');
  console.log('\n1. Run `crontab -e` to edit your cron jobs');
  console.log('2. Add the following line:');
  console.log(`   0 2 * * * cd ${process.cwd()} && npx tsx scripts/db-backup.ts backup`);
  console.log('\nAlternatively, for a Replit environment, set up a workflow or use an external service like GitHub Actions.');
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Database Backup and Recovery Utility
====================================

This tool helps you manage database backups and restoration for the Dana AI platform.

Usage:
  npx tsx scripts/db-backup.ts <command> [arguments]

Commands:
  backup                - Create a full database backup
  restore [backup-file] - Restore from a backup file (defaults to most recent)
  list                  - List available backups
  schedule              - Information on setting up scheduled backups
  help                  - Show this help information

Examples:
  npx tsx scripts/db-backup.ts backup
  npx tsx scripts/db-backup.ts restore dana-ai-backup-2025-05-21.sql
  npx tsx scripts/db-backup.ts list
  `);
}

// Main function to process command line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  switch (command) {
    case 'backup':
      await createBackup();
      break;
      
    case 'restore':
      await restoreFromBackup(args[1]);
      break;
      
    case 'list':
      listBackups();
      break;
      
    case 'schedule':
      await setupScheduledBackups();
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