# Database Migration Strategy Guide

This document outlines the database migration strategy for the Dana AI platform. Our approach ensures safe, versioned, and traceable database schema changes throughout the application lifecycle.

## Overview

We use Drizzle ORM with a custom migration system that:
- Tracks schema changes in version-controlled migration files
- Applies migrations in the correct order
- Records migration history
- Detects schema drift
- Provides easy-to-use migration commands

## Migration Commands

All database migration operations are handled through our comprehensive migration script:

```bash
# Generate a new migration
npx tsx scripts/db-migrate.ts generate <migration-name>

# Apply pending migrations
npx tsx scripts/db-migrate.ts apply

# Check migration status
npx tsx scripts/db-migrate.ts status

# Check for schema drift
npx tsx scripts/db-migrate.ts check
```

## Migration Workflow

### 1. Making Schema Changes

Update the database schema in `shared/schema.ts` when you need to modify the database structure. This includes:
- Adding or removing tables
- Adding, modifying, or removing columns
- Adding or changing relationships
- Modifying constraints or indexes

**Example:**
```typescript
// Adding a new column to an existing table in shared/schema.ts
export const users = pgTable("users", {
  // Existing columns...
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  
  // New column being added
  lastLoginAt: timestamp("last_login_at"),
});
```

### 2. Generating a Migration

After modifying the schema, generate a migration to track these changes:

```bash
npx tsx scripts/db-migrate.ts generate add_last_login_timestamp
```

This creates a timestamped migration directory with SQL files that represent the changes needed to transform the database.

### 3. Reviewing the Migration

Examine the generated migration files to ensure they accurately represent your intended changes:

```bash
cat migrations/20250521213000_add_last_login_timestamp/migration.sql
```

### 4. Applying the Migration

Apply the migration to update the database:

```bash
npx tsx scripts/db-migrate.ts apply
```

This will:
1. Execute the SQL in the migration files
2. Record the applied migration in the history
3. Update the database to match your schema changes

### 5. Verifying the Migration

Check the migration status to confirm it was applied correctly:

```bash
npx tsx scripts/db-migrate.ts status
```

## Best Practices

1. **Make small, focused migrations**: Each migration should represent a single logical change.

2. **Use meaningful names**: Name migrations descriptively to understand their purpose at a glance.

3. **Version control migrations**: Commit migration files to your Git repository to track schema history.

4. **Test migrations**: Always test migrations in a development environment before applying them to production.

5. **Never edit applied migrations**: Once a migration has been applied to any environment, consider it immutable.

6. **Maintain backwards compatibility**: When possible, design migrations that don't break existing code.

## Database Migration CI/CD Integration

For automated deployments, integrate the migration system with your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow step
- name: Apply database migrations
  run: npx tsx scripts/db-migrate.ts apply
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Troubleshooting

### Schema Drift

If the database schema doesn't match your code definitions:

```bash
npx tsx scripts/db-migrate.ts check
```

This will identify discrepancies between your schema definitions and the actual database structure.

### Failed Migrations

If a migration fails:

1. Check the error message for specific issues
2. Fix the underlying problem in your schema
3. For development environments only, you can use `db:push` to force-update the schema:
   ```bash
   npm run db:push
   ```
   Note: Only use this in development; proper migrations should be used for staging/production.

## Migration Directory Structure

```
migrations/
├── 20250521213000_add_last_login_timestamp/  # Timestamped migration directory
│   ├── migration.sql                          # SQL statements for the migration
│   └── meta.json                              # Metadata about the migration
├── applied/                                   # Record of applied migrations
│   └── 20250521213000_add_last_login_timestamp.json  # Applied migration record
```

## Conclusion

Following this migration strategy ensures database changes are:
- Tracked in version control
- Applied consistently across environments
- Documented with clear history
- Safely executed to minimize downtime and data loss risks

For any questions or assistance with database migrations, refer to the Dana AI development team.