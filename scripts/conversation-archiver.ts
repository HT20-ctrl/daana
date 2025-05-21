/**
 * Conversation Archiving Utility
 * 
 * This script provides functionality to archive older conversations from the
 * active database to separate storage, maintaining application performance
 * while preserving historical data.
 * 
 * Usage:
 *   npx tsx scripts/conversation-archiver.ts archive --days=90   - Archive conversations older than 90 days
 *   npx tsx scripts/conversation-archiver.ts stats                - Show archiving statistics
 *   npx tsx scripts/conversation-archiver.ts restore <id>         - Restore a specific archived conversation
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { conversations, messages } from '../shared/schema';
import { eq, lt, and } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { promisify } from 'util';
import * as readline from 'readline';

// Constants
const ARCHIVE_DIR = path.join(process.cwd(), 'archives', 'conversations');
const ARCHIVE_INDEX_FILE = path.join(ARCHIVE_DIR, 'archive_index.json');
const DEFAULT_ARCHIVE_DAYS = 90;

// Ensure archive directory exists
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// Initialize archive index if it doesn't exist
if (!fs.existsSync(ARCHIVE_INDEX_FILE)) {
  fs.writeFileSync(ARCHIVE_INDEX_FILE, JSON.stringify({
    archives: [],
    totalArchived: 0,
    lastArchiveDate: null
  }, null, 2));
}

// Archive index type
interface ArchiveIndex {
  archives: {
    date: string;
    file: string;
    conversationCount: number;
    messageCount: number;
    organizationIds: string[];
  }[];
  totalArchived: number;
  lastArchiveDate: string | null;
}

/**
 * Archive conversations older than the specified number of days
 */
async function archiveOldConversations(days: number = DEFAULT_ARCHIVE_DAYS) {
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    console.log(`Archiving conversations older than ${cutoffDate.toISOString()} (${days} days old)...`);
    
    // Find conversations to archive
    const oldConversations = await db.select().from(conversations)
      .where(lt(conversations.updatedAt, cutoffDate));
    
    if (oldConversations.length === 0) {
      console.log('No conversations found to archive.');
      return;
    }
    
    console.log(`Found ${oldConversations.length} conversations to archive.`);
    
    // Confirm before proceeding
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirmation = await new Promise<boolean>((resolve) => {
      rl.question(`Do you want to proceed with archiving ${oldConversations.length} conversations? (y/N) `, (answer) => {
        resolve(answer.toLowerCase() === 'y');
        rl.close();
      });
    });
    
    if (!confirmation) {
      console.log('Archiving cancelled.');
      return;
    }
    
    // Create archive files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const conversationsFile = path.join(ARCHIVE_DIR, `conversations-${timestamp}.csv`);
    const messagesFile = path.join(ARCHIVE_DIR, `messages-${timestamp}.csv`);
    
    // Get conversation IDs to archive
    const conversationIds = oldConversations.map(conv => conv.id);
    
    // Fetch all messages for these conversations
    const conversationMessages = await db.select().from(messages)
      .where(and(...conversationIds.map(id => eq(messages.conversationId, id))));
    
    console.log(`Found ${conversationMessages.length} messages belonging to these conversations.`);
    
    // Prepare CSV data for conversations
    const conversationsCsv = stringify(oldConversations, {
      header: true,
      columns: Object.keys(oldConversations[0])
    });
    
    // Prepare CSV data for messages
    const messagesCsv = stringify(conversationMessages, {
      header: true,
      columns: Object.keys(conversationMessages[0] || {})
    });
    
    // Write the CSV files
    fs.writeFileSync(conversationsFile, conversationsCsv);
    fs.writeFileSync(messagesFile, messagesCsv);
    
    console.log(`Conversations exported to ${conversationsFile}`);
    console.log(`Messages exported to ${messagesFile}`);
    
    // Create metadata file with relationship info
    const metadataFile = path.join(ARCHIVE_DIR, `metadata-${timestamp}.json`);
    const metadata = {
      archiveDate: new Date().toISOString(),
      cutoffDate: cutoffDate.toISOString(),
      conversationCount: oldConversations.length,
      messageCount: conversationMessages.length,
      conversationIds,
      organizationIds: [...new Set(oldConversations.map(conv => conv.organizationId).filter(Boolean))],
      conversationsFile,
      messagesFile
    };
    
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    
    // Update the archive index
    const archiveIndex = JSON.parse(fs.readFileSync(ARCHIVE_INDEX_FILE, 'utf8')) as ArchiveIndex;
    archiveIndex.archives.push({
      date: new Date().toISOString(),
      file: metadataFile,
      conversationCount: oldConversations.length,
      messageCount: conversationMessages.length,
      organizationIds: metadata.organizationIds as string[]
    });
    archiveIndex.totalArchived += oldConversations.length;
    archiveIndex.lastArchiveDate = new Date().toISOString();
    
    fs.writeFileSync(ARCHIVE_INDEX_FILE, JSON.stringify(archiveIndex, null, 2));
    
    // Remove archived conversations from the database
    console.log('Removing archived conversations from the active database...');
    
    // Delete messages first (foreign key constraint)
    let deletedMessages = 0;
    for (const id of conversationIds) {
      const result = await db.delete(messages).where(eq(messages.conversationId, id));
      deletedMessages += result.count || 0;
    }
    
    // Delete conversations
    const deletedConversations = await db.delete(conversations)
      .where(and(...conversationIds.map(id => eq(conversations.id, id))));
    
    console.log(`✅ Successfully archived and removed ${deletedConversations.count} conversations and ${deletedMessages} messages from the active database.`);
    
    return {
      archived: deletedConversations.count,
      messages: deletedMessages,
      metadataFile
    };
  } catch (error) {
    console.error('Error archiving conversations:', error);
    return null;
  }
}

/**
 * Show statistics about archived conversations
 */
function showArchiveStats() {
  try {
    if (!fs.existsSync(ARCHIVE_INDEX_FILE)) {
      console.log('No archive index found. No conversations have been archived yet.');
      return;
    }
    
    const archiveIndex = JSON.parse(fs.readFileSync(ARCHIVE_INDEX_FILE, 'utf8')) as ArchiveIndex;
    
    console.log('\nConversation Archive Statistics');
    console.log('==============================');
    
    if (archiveIndex.archives.length === 0) {
      console.log('No conversations have been archived yet.');
      return;
    }
    
    console.log(`Total archived conversations: ${archiveIndex.totalArchived}`);
    console.log(`Last archive date: ${archiveIndex.lastArchiveDate || 'Never'}`);
    console.log(`Number of archive operations: ${archiveIndex.archives.length}`);
    
    console.log('\nArchive History:');
    archiveIndex.archives.forEach((archive, index) => {
      console.log(`\n${index + 1}. Archive from ${new Date(archive.date).toLocaleString()}`);
      console.log(`   Conversations: ${archive.conversationCount}`);
      console.log(`   Messages: ${archive.messageCount}`);
      console.log(`   Organizations: ${archive.organizationIds.length}`);
      console.log(`   Metadata file: ${archive.file}`);
    });
    
    // Calculate storage savings
    let totalConversations = 0;
    let totalMessages = 0;
    
    archiveIndex.archives.forEach(archive => {
      totalConversations += archive.conversationCount;
      totalMessages += archive.messageCount;
    });
    
    // Assume average row sizes
    const estimatedSavingsMB = ((totalConversations * 2) + (totalMessages * 4)) / 1024;
    
    console.log(`\nEstimated storage savings: ~${estimatedSavingsMB.toFixed(2)} MB`);
    console.log(`\nArchives are stored in: ${ARCHIVE_DIR}`);
  } catch (error) {
    console.error('Error showing archive stats:', error);
  }
}

/**
 * Restore a specific conversation from archive
 */
async function restoreFromArchive(conversationId: string) {
  try {
    if (!conversationId) {
      console.error('Error: Conversation ID is required for restoration');
      console.log('Usage: npx tsx scripts/conversation-archiver.ts restore <conversation-id>');
      return false;
    }
    
    console.log(`Searching for archived conversation with ID: ${conversationId}`);
    
    if (!fs.existsSync(ARCHIVE_INDEX_FILE)) {
      console.error('No archive index found. No conversations have been archived.');
      return false;
    }
    
    const archiveIndex = JSON.parse(fs.readFileSync(ARCHIVE_INDEX_FILE, 'utf8')) as ArchiveIndex;
    
    if (archiveIndex.archives.length === 0) {
      console.error('No archives found. No conversations have been archived.');
      return false;
    }
    
    // Search through all archive metadata files
    for (const archive of archiveIndex.archives) {
      if (!fs.existsSync(archive.file)) {
        console.warn(`Warning: Archive metadata file ${archive.file} not found. Skipping.`);
        continue;
      }
      
      const metadata = JSON.parse(fs.readFileSync(archive.file, 'utf8'));
      
      if (metadata.conversationIds.includes(conversationId)) {
        console.log(`Found conversation ${conversationId} in archive from ${new Date(archive.date).toLocaleString()}`);
        
        // Confirm restoration
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const confirmation = await new Promise<boolean>((resolve) => {
          rl.question(`Do you want to restore this conversation to the active database? (y/N) `, (answer) => {
            resolve(answer.toLowerCase() === 'y');
            rl.close();
          });
        });
        
        if (!confirmation) {
          console.log('Restoration cancelled.');
          return false;
        }
        
        // Read the archived conversations and messages
        const conversationsCsv = fs.readFileSync(metadata.conversationsFile, 'utf8');
        const messagesCsv = fs.readFileSync(metadata.messagesFile, 'utf8');
        
        // Parse CSV data
        const conversationsData = conversationsCsv.split('\n');
        const messagesData = messagesCsv.split('\n');
        
        // Get headers
        const conversationHeaders = conversationsData[0].split(',');
        const messageHeaders = messagesData[0].split(',');
        
        // Find the conversation data
        const conversationRow = conversationsData.find(row => {
          const cols = row.split(',');
          const idIndex = conversationHeaders.indexOf('id');
          return cols[idIndex] === conversationId;
        });
        
        if (!conversationRow) {
          console.error(`Error: Conversation data not found in the archive file.`);
          return false;
        }
        
        // Parse conversation data
        const conversationValues = conversationRow.split(',');
        const conversation: Record<string, any> = {};
        
        conversationHeaders.forEach((header, index) => {
          conversation[header] = conversationValues[index];
        });
        
        // Find message data for this conversation
        const messageRows = messagesData.filter(row => {
          if (!row) return false;
          const cols = row.split(',');
          const convIdIndex = messageHeaders.indexOf('conversationId');
          return convIdIndex >= 0 && cols[convIdIndex] === conversationId;
        });
        
        // Check if conversation already exists in the database
        const existingConversation = await db.select().from(conversations)
          .where(eq(conversations.id, conversationId));
        
        if (existingConversation.length > 0) {
          console.error(`Error: Conversation with ID ${conversationId} already exists in the database.`);
          
          const overwriteConfirmation = await new Promise<boolean>((resolve) => {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            
            rl.question(`Do you want to overwrite the existing conversation? (y/N) `, (answer) => {
              resolve(answer.toLowerCase() === 'y');
              rl.close();
            });
          });
          
          if (!overwriteConfirmation) {
            console.log('Restoration cancelled.');
            return false;
          }
          
          // Delete existing conversation and its messages
          await db.delete(messages).where(eq(messages.conversationId, conversationId));
          await db.delete(conversations).where(eq(conversations.id, conversationId));
        }
        
        // Insert restored conversation
        await db.insert(conversations).values({
          id: conversation.id,
          title: conversation.title,
          userId: conversation.userId,
          platformId: conversation.platformId ? parseInt(conversation.platformId) : null,
          createdAt: new Date(conversation.createdAt),
          updatedAt: new Date(conversation.updatedAt),
          organizationId: conversation.organizationId
        });
        
        console.log(`Restored conversation: ${conversation.title} (ID: ${conversation.id})`);
        
        // Parse and insert messages
        let restoredMessages = 0;
        
        for (const messageRow of messageRows) {
          if (!messageRow) continue;
          
          const messageValues = messageRow.split(',');
          const message: Record<string, any> = {};
          
          messageHeaders.forEach((header, index) => {
            message[header] = messageValues[index];
          });
          
          // Insert message
          await db.insert(messages).values({
            id: message.id,
            content: message.content,
            sender: message.sender,
            conversationId: conversationId,
            createdAt: new Date(message.createdAt),
            isAiGenerated: message.isAiGenerated === 'true'
          });
          
          restoredMessages++;
        }
        
        console.log(`Restored ${restoredMessages} messages for this conversation.`);
        console.log('✅ Conversation restoration completed successfully!');
        
        return true;
      }
    }
    
    console.error(`Conversation with ID ${conversationId} not found in any archive.`);
    return false;
  } catch (error) {
    console.error('Error restoring conversation:', error);
    return false;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Conversation Archiving Utility
==============================

This tool helps you manage the archiving of older conversations to optimize database performance.

Usage:
  npx tsx scripts/conversation-archiver.ts <command> [arguments]

Commands:
  archive [--days=<days>]  - Archive conversations older than specified days (default: 90)
  stats                    - Show statistics about archived conversations
  restore <conversation-id> - Restore a specific conversation from archive
  help                     - Show this help information

Examples:
  npx tsx scripts/conversation-archiver.ts archive --days=180
  npx tsx scripts/conversation-archiver.ts stats
  npx tsx scripts/conversation-archiver.ts restore 12345
  `);
}

// Main function to process command line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  if (!command) {
    showHelp();
    return;
  }
  
  switch (command) {
    case 'archive': {
      // Parse days argument
      const daysArg = args.find(arg => arg.startsWith('--days='));
      const days = daysArg 
        ? parseInt(daysArg.split('=')[1], 10) 
        : DEFAULT_ARCHIVE_DAYS;
      
      if (isNaN(days) || days <= 0) {
        console.error('Error: Days must be a positive number');
        return;
      }
      
      await archiveOldConversations(days);
      break;
    }
    
    case 'stats':
      showArchiveStats();
      break;
    
    case 'restore':
      if (args.length < 2) {
        console.error('Error: Conversation ID is required for restoration');
        console.log('Usage: npx tsx scripts/conversation-archiver.ts restore <conversation-id>');
        return;
      }
      
      await restoreFromArchive(args[1]);
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