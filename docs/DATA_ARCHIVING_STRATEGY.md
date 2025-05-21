# Data Archiving Strategy

This document outlines the data archiving strategy for the Dana AI platform, focusing on managing conversation history and optimizing database performance as your data grows.

## Overview

As your organization uses Dana AI over time, the volume of conversation data will grow significantly. To maintain optimal performance while preserving historical data, we've implemented an intelligent archiving system that:

1. Moves older, less frequently accessed conversations to archive storage
2. Preserves complete conversation history for compliance and reference
3. Optimizes database query performance for active data
4. Provides tools to restore archived conversations when needed

## Archiving Policy

### What Gets Archived

The following data is eligible for archiving:

* Conversations older than 90 days (configurable)
* Associated messages, attachments, and metadata
* Conversation analytics data

### What Stays in Active Storage

The following data always remains in the active database:

* User accounts and profiles
* Organization settings
* Platform connections
* Knowledge base items
* System configuration
* Recent conversations (less than 90 days old)

## Archiving Process

The Dana AI platform includes a dedicated archiving utility (`scripts/conversation-archiver.ts`) that:

1. Identifies conversations meeting archiving criteria
2. Exports complete conversation data to structured CSV files
3. Creates metadata records linking all related conversation components
4. Maintains an archive index for easy search and retrieval
5. Safely removes archived data from the active database

### Running the Archiver

To archive older conversations:

```bash
npx tsx scripts/conversation-archiver.ts archive --days=90
```

This will:
* Identify conversations older than 90 days
* Export them to CSV files in the `/archives/conversations` directory
* Create metadata records for each archived batch
* Update the archive index
* Remove archived conversations from the active database

### Customizing Archive Settings

The default archiving threshold is 90 days, but you can adjust this based on your needs:

```bash
npx tsx scripts/conversation-archiver.ts archive --days=180  # Archive conversations older than 180 days
```

## Viewing Archive Statistics

To view statistics about your archived data:

```bash
npx tsx scripts/conversation-archiver.ts stats
```

This displays:
* Total number of archived conversations
* Date of last archive operation
* Storage space saved
* Breakdown by organization
* Complete archive history

## Restoring Archived Conversations

If you need to access a specific archived conversation:

```bash
npx tsx scripts/conversation-archiver.ts restore <conversation-id>
```

This will:
1. Search for the conversation ID across all archives
2. Display conversation details for confirmation
3. Restore the conversation and all associated messages to the active database

## Archiving Best Practices

### 1. Regular Archiving Schedule

Establish a consistent archiving schedule to maintain database performance:

* Monthly: For high-volume systems (10,000+ conversations per month)
* Quarterly: For moderate-volume systems (1,000-10,000 conversations per month)
* Annually: For low-volume systems (fewer than 1,000 conversations per month)

### 2. Retention Policies

Define clear retention policies based on:

* Regulatory requirements for your industry
* Internal compliance needs
* User privacy considerations
* Performance optimization goals

### 3. Archive Storage Management

* Store archive files securely with appropriate access controls
* Back up archive storage regularly
* Consider moving older archives to cold storage for cost optimization

### 4. Performance Monitoring

Monitor database performance metrics to determine if more aggressive archiving is needed:

* Query response times
* Database size
* Index performance
* Server resource utilization

## Data Access Considerations

### Searching Archived Data

The current implementation requires restoring conversations to search their content. Future enhancements may include:

* Indexed search of archive contents
* Partial restoration of conversation snippets
* API access to archived conversations

### Compliance and Audit

For compliance and audit purposes:

* All archive operations are logged with timestamps and user information
* Archive metadata includes organizational context and relationship data
* The complete history of archiving operations is maintained

## Conclusion

This data archiving strategy balances performance optimization with data preservation, ensuring your Dana AI platform remains responsive as your conversation history grows over time.

For additional assistance with data archiving or restoration, contact the Dana AI support team.