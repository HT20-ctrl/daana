# Database Backup & Recovery Guide

This document outlines the backup and recovery procedures for the Dana AI platform's PostgreSQL database. Following these practices will help protect your data against data loss, corruption, or system failures.

## Overview

The Dana AI platform includes built-in tools for database backup and recovery:

- Regular automated backups
- Point-in-time recovery options
- Simple restoration procedures
- Backup rotation and management

## Backup Types

### Full Database Backups

Full backups capture the entire database state, including all tables, indexes, and data. These are the foundation of our backup strategy and are performed daily.

### Transaction Log Backups (Optional)

For production environments requiring minimal data loss, PostgreSQL's Write-Ahead Logging (WAL) can be configured for point-in-time recovery. This requires additional server configuration.

## Backup Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full Backup | Daily (2 AM) | 10 most recent |
| WAL Archives | Continuous | 7 days |

## Backup Tools

The Dana AI platform provides a comprehensive backup utility script in `scripts/db-backup.ts` that handles all backup operations.

### Creating a Manual Backup

To create an immediate full backup:

```bash
npx tsx scripts/db-backup.ts backup
```

This will:
1. Create a timestamped SQL backup file in the `/backups` directory
2. Display the backup size and location
3. Automatically manage backup rotation (keeping the 10 most recent backups)

### Setting Up Automated Backups

For production environments, configure scheduled backups:

```bash
npx tsx scripts/db-backup.ts schedule
```

Follow the displayed instructions to set up cron jobs or use an external scheduling service.

### Listing Available Backups

To view all available backups:

```bash
npx tsx scripts/db-backup.ts list
```

This displays detailed information about each backup, including:
- Creation timestamp
- File size
- Complete file path

## Backup Storage Recommendations

1. **Primary Storage**: Keep recent backups on the application server for quick recovery
2. **Secondary Storage**: Replicate backups to a separate cloud storage service (AWS S3, Google Cloud Storage, etc.)
3. **Cold Storage**: Archive monthly backups to long-term storage for compliance and disaster recovery

## Recovery Procedures

### Standard Recovery

To restore from the most recent backup:

```bash
npx tsx scripts/db-backup.ts restore
```

To restore from a specific backup file:

```bash
npx tsx scripts/db-backup.ts restore dana-ai-backup-2025-05-21.sql
```

The restore process:
1. Prompts for confirmation before proceeding
2. Completely replaces the current database with the backup data
3. Preserves all relationships and constraints

### Point-in-Time Recovery (Advanced)

For environments with WAL archiving configured, point-in-time recovery allows restoring to a specific moment:

1. Restore the most recent full backup
2. Apply WAL archives up to the desired recovery point
3. Configure `recovery.conf` with the target timestamp
4. Start PostgreSQL in recovery mode

## Disaster Recovery Planning

### Recovery Time Objective (RTO)

The Dana AI platform's backup strategy is designed to meet an RTO of:
- 15 minutes for standard recovery
- 30 minutes for point-in-time recovery

### Recovery Point Objective (RPO) 

The platform's backup strategy supports:
- 24 hours RPO with daily backups
- Near-zero RPO with WAL archiving (optional)

### Testing Recovery Procedures

It's crucial to regularly test backup restoration to ensure readiness for actual recovery scenarios:

1. Schedule quarterly recovery drills
2. Restore to a separate test database
3. Verify data integrity and application functionality
4. Document the results and any issues encountered

## Additional Protection Measures

### Database Replication

For mission-critical deployments, consider setting up PostgreSQL replication:
- Primary/standby configuration
- Automatic failover capabilities
- Distributed read load across replicas

### Monitoring and Alerts

Monitor backup completion and integrity:
- Set up alerts for failed backups
- Monitor backup size trends
- Verify backup integrity with periodic test restores

## Conclusion

Following these backup and recovery procedures helps ensure business continuity and data protection for your Dana AI platform. Regularly review and update these procedures as your data needs evolve.

For further assistance or questions about database backups and recovery, please contact the Dana AI platform support team.