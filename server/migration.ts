/**
 * Database migration script for schema optimizations
 * Run this script with: npm run db:push
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { exit } from "process";

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    exit(1);
  }

  try {
    console.log("🔄 Starting database migration...");

    // Connect to the PostgreSQL database
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client);

    // Run the migration (this will apply the schema changes with the new indexes)
    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("✅ Database migration completed successfully");
    console.log("  - Added indexes for faster query performance");
    console.log("  - Optimized database schema");
    
    exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    exit(1);
  }
};

runMigration();