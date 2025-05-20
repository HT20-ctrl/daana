/**
 * Enhanced database configuration with performance optimizations
 * This module provides optimized database connection settings
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

// Get the connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create an optimized postgres client with enhanced settings
export const pgClient = postgres(connectionString, {
  max: 20, // Increased pool size for better handling of concurrent requests
  idle_timeout: 60, // Longer idle timeout for better connection reuse
  connect_timeout: 10, // Connection timeout
  prepare: true, // Enable prepared statements for query caching
  types: {
    // Custom parsers for performance with specific data types
    date: {
      to: 1184, // timestamp with time zone
      from: [1082, 1083, 1114, 1184], // date, time, timestamp, timestamptz
      serialize: (date: Date) => date,
      parse: (str: string) => new Date(str),
    },
  },
  // Only log queries in development mode
  debug: process.env.NODE_ENV === 'development',
});

// Export the drizzle ORM instance with our optimized postgres client
export const db = drizzle(pgClient);

// Close the database connection (useful for clean shutdowns)
export async function closeDatabase() {
  try {
    await pgClient.end();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

/**
 * Get a read-only transaction for operations that don't modify data
 * This can improve performance for read-heavy operations
 */
/**
 * Creates a read-only transaction for better query performance
 * This optimizes database access for read operations
 */
export async function getReadTransaction() {
  const tx = db.transaction(async (tx) => {
    // Use raw SQL to set the transaction to read-only mode
    await tx.execute(sql.raw('SET TRANSACTION READ ONLY'));
    return tx;
  });
  return tx;
}

/**
 * Execute a query with timeout to prevent long-running queries
 * @param queryFn The query function to execute
 * @param timeoutMs Maximum execution time in milliseconds
 */
export async function executeWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Query execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    // Race the query against the timeout
    const result = await Promise.race([queryFn(), timeoutPromise]) as T;
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}