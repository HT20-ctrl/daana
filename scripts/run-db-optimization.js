#!/usr/bin/env node

/**
 * Database Optimization Runner
 * 
 * This script executes the database optimization process
 * to improve query performance across the application.
 */

import { execSync } from 'child_process';

console.log('Starting Dana AI Platform database optimization process...');

try {
  console.log('Checking database connection...');
  
  // Execute the database optimization script
  console.log('Applying database performance optimizations...');
  console.log('This may take a moment depending on your database size.');
  
  try {
    // Execute the TypeScript script using tsx (safe for production environments)
    execSync('npx tsx scripts/optimize-database.ts', { stdio: 'inherit' });
    
    console.log('\n✅ Database optimization completed successfully!');
    console.log('Your database now has the following performance improvements:');
    console.log('  - Optimized indexes for faster data retrieval');
    console.log('  - Improved search capabilities for knowledge base');
    console.log('  - Enhanced query performance for conversations and messages');
    console.log('  - Faster analytics data access');
    console.log('\nYou should notice improved application response times, especially');
    console.log('with larger datasets and concurrent users.');
    
  } catch (error) {
    console.error('\n❌ Database optimization failed.');
    console.error('Please ensure your database is running and credentials are correct.');
    console.error('You can check the DATABASE_URL environment variable.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('Unexpected error during optimization process:', error);
  process.exit(1);
}