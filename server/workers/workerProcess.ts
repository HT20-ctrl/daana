/**
 * Worker Process for Dana AI
 * 
 * This module provides the main worker process for handling asynchronous tasks
 * from the message queue. It processes various task types like AI response generation,
 * email notifications, data exports, and analytics processing.
 */

import { initializeMessageQueue, consumeMessages, QueueName, TaskType, QueueMessage } from '../messaging/messageQueue';
import { logInfo, logError } from '../utils/logger';
import { db } from '../db';
import { generateAIResponse } from '../ai'; 

// Task handlers mapped by task type
const taskHandlers: Record<TaskType, (payload: any, metadata: QueueMessage['metadata']) => Promise<void>> = {
  // Handler for AI response generation
  [TaskType.GENERATE_AI_RESPONSE]: async (payload, metadata) => {
    try {
      const { conversationId, prompt, messageId } = payload;
      
      logInfo(`Generating AI response for conversation ${conversationId}`, { requestId: metadata.requestId });
      
      // Generate AI response
      const aiResponse = await generateAIResponse(prompt, {
        userId: metadata.userId,
        organizationId: metadata.organizationId
      });
      
      // Store the response in the database
      await db.query(
        `UPDATE messages 
         SET content = $1, is_ai_generated = TRUE, updated_at = NOW() 
         WHERE id = $2`,
        [aiResponse, messageId]
      );
      
      logInfo(`AI response generated and stored for message ${messageId}`, {
        requestId: metadata.requestId,
        conversationId
      });
    } catch (error) {
      logError(`Failed to generate AI response`, error, {
        requestId: metadata.requestId,
        payload
      });
      throw error; // Rethrow to trigger message nack
    }
  },
  
  // Handler for email notifications
  [TaskType.SEND_EMAIL]: async (payload, metadata) => {
    try {
      const { template, recipientEmail, subject, data } = payload;
      
      logInfo(`Sending email to ${recipientEmail}`, {
        requestId: metadata.requestId,
        template
      });
      
      // In a real implementation, this would use a service like SendGrid or Nodemailer
      // For now, we'll just log the operation
      logInfo(`Email sending simulation complete for ${recipientEmail}`, {
        requestId: metadata.requestId,
        subject
      });
    } catch (error) {
      logError(`Failed to send email`, error, {
        requestId: metadata.requestId,
        payload
      });
      throw error;
    }
  },
  
  // Handler for data exports
  [TaskType.EXPORT_CONVERSATION_DATA]: async (payload, metadata) => {
    try {
      const { conversationIds, format, userId } = payload;
      
      logInfo(`Exporting conversations data for user ${userId}`, {
        requestId: metadata.requestId,
        conversationCount: conversationIds.length
      });
      
      // In a real implementation, this would query the database for conversations
      // and generate a file in the requested format
      
      logInfo(`Data export complete for user ${userId}`, {
        requestId: metadata.requestId,
        format
      });
    } catch (error) {
      logError(`Failed to export conversation data`, error, {
        requestId: metadata.requestId,
        payload
      });
      throw error;
    }
  },
  
  // Handler for platform synchronization
  [TaskType.SYNC_PLATFORM_DATA]: async (payload, metadata) => {
    try {
      const { platformId, platformType } = payload;
      
      logInfo(`Synchronizing data for platform ${platformId}`, {
        requestId: metadata.requestId,
        platformType
      });
      
      // In a real implementation, this would fetch new data from the external platform
      // and update the local database
      
      logInfo(`Platform synchronization complete for ${platformId}`, {
        requestId: metadata.requestId
      });
    } catch (error) {
      logError(`Failed to synchronize platform data`, error, {
        requestId: metadata.requestId,
        payload
      });
      throw error;
    }
  },
  
  // Handler for analytics processing
  [TaskType.GENERATE_ANALYTICS]: async (payload, metadata) => {
    try {
      const { organizationId, timeRange, metrics } = payload;
      
      logInfo(`Generating analytics for organization ${organizationId}`, {
        requestId: metadata.requestId,
        timeRange
      });
      
      // In a real implementation, this would execute complex queries and calculations
      // to generate analytics data
      
      logInfo(`Analytics generation complete for organization ${organizationId}`, {
        requestId: metadata.requestId
      });
    } catch (error) {
      logError(`Failed to generate analytics`, error, {
        requestId: metadata.requestId,
        payload
      });
      throw error;
    }
  }
};

/**
 * Initialize worker process and start consuming messages from all queues
 */
export async function startWorkerProcess(): Promise<void> {
  try {
    // Initialize the message queue connection
    await initializeMessageQueue();
    
    // Start consuming messages from each queue
    for (const queueName of Object.values(QueueName)) {
      await consumeMessages(queueName, async (message) => {
        const { taskType, payload, metadata } = message;
        
        logInfo(`Processing task ${taskType} from queue ${queueName}`, {
          requestId: metadata.requestId
        });
        
        // Find and execute the appropriate task handler
        const handler = taskHandlers[taskType];
        if (handler) {
          await handler(payload, metadata);
        } else {
          logError(`No handler found for task type ${taskType}`, null, {
            requestId: metadata.requestId
          });
          throw new Error(`Unsupported task type: ${taskType}`);
        }
      });
    }
    
    logInfo('Worker process started successfully');
  } catch (error) {
    logError('Failed to start worker process', error);
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('Received SIGTERM signal, shutting down worker process');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logInfo('Received SIGINT signal, shutting down worker process');
  process.exit(0);
});

// Start the worker process if this file is the entry point
if (require.main === module) {
  startWorkerProcess().catch((error) => {
    logError('Unhandled error in worker process', error);
    process.exit(1);
  });
}