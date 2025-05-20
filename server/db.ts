/**
 * Database connection module for PostgreSQL
 * This module provides a singleton connection to the PostgreSQL database
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Initialize postgres connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a postgres client with the connection string and optimized settings
const client = postgres(connectionString, {
  max: 20, // Increased pool size for better handling of concurrent requests
  idle_timeout: 60, // Increased idle timeout for connection reuse
  connect_timeout: 10, // How many seconds to wait for a connection
  prepare: true, // Enable prepared statements for frequently used queries
  types: {
    // Add custom parsers for better performance with certain data types
    date: {
      to: 1184, // timestamp with time zone
      from: [1082, 1083, 1114, 1184], // date, time, timestamp, timestamptz
      serialize: (date: Date) => date,
      parse: (str: string) => new Date(str),
    },
  },
  debug: process.env.NODE_ENV === 'development', // Log queries in development
});

// Export the drizzle instance with our postgres client
export const db = drizzle(client);

// Export a function to close the connection pool
export const closeConnection = async () => {
  await client.end();
};