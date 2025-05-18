import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

// Configure the Neon database connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool and Drizzle ORM instance
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Helper function to format dates for consistent serialization
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

// Helper function to handle JSON fields
export function safeJsonParse(json: string | null): any {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
}