#!/usr/bin/env node

/**
 * Database Optimization Runner
 * 
 * This script executes the database optimization process
 * to improve query performance across the application.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Dana AI Platform - Database Performance Optimization Tool');
console.log('=========================================================');
console.log();
console.log('This tool will optimize your database for better performance by:');
console.log('  1. Adding indexes for faster queries');
console.log('  2. Optimizing database connection settings');
console.log('  3. Updating statistics for the query planner');
console.log();

try {
  console.log('📊 Running database optimization script...');
  execSync('npx tsx scripts/optimize-database.ts', { stdio: 'inherit' });
  
  console.log();
  console.log('✅ Database optimization completed successfully!');
  console.log();
  console.log('Your Dana AI Platform should now experience:');
  console.log('  • Faster query response times');
  console.log('  • Better handling of concurrent requests');
  console.log('  • Reduced server load during peak usage');
  console.log();
  console.log('To verify the improvements, monitor the API response times');
  console.log('in your browser\'s developer tools Network tab.');
} catch (error) {
  console.error('❌ Database optimization failed:');
  console.error(error.message);
  console.error();
  console.error('Please check your database connection and try again.');
  process.exit(1);
}