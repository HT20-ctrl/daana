/**
 * Message Queue Integration for Dana AI
 * 
 * This module provides functionality for asynchronous processing of tasks
 * using RabbitMQ as the message broker. It allows the application to handle
 * long-running operations without blocking the main thread or API response times.
 */

import amqp from 'amqplib';
import { logError, logInfo } from '../utils/logger';

// Message queue connection configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const RECONNECT_TIMEOUT = 5000; // 5 seconds

// Queue names
export enum QueueName {
  AI_PROCESSING = 'ai-processing',
  EMAIL_NOTIFICATIONS = 'email-notifications',
  DATA_EXPORTS = 'data-exports',
  PLATFORM_SYNC = 'platform-sync',
  ANALYTICS_PROCESSING = 'analytics-processing'
}

// Define task types
export enum TaskType {
  GENERATE_AI_RESPONSE = 'generate-ai-response',
  SEND_EMAIL = 'send-email',
  EXPORT_CONVERSATION_DATA = 'export-conversation-data',
  SYNC_PLATFORM_DATA = 'sync-platform-data',
  GENERATE_ANALYTICS = 'generate-analytics'
}

// Message structure
export interface QueueMessage<T = any> {
  taskType: TaskType;
  priority: number;
  payload: T;
  metadata: {
    userId: string;
    organizationId: string;
    timestamp: number;
    requestId: string;
  };
}

// Connection state
let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;
let isConnecting = false;

/**
 * Initialize the connection to RabbitMQ
 */
export async function initializeMessageQueue(): Promise<void> {
  if (isConnecting) return;
  
  isConnecting = true;
  
  try {
    // Close existing connection if any
    if (connection) {
      await connection.close();
    }
    
    // Connect to RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Set up queues with appropriate settings
    await setupQueues();
    
    // Set up connection error handling
    connection.on('error', handleConnectionError);
    connection.on('close', handleConnectionClosed);
    
    isConnecting = false;
    
    logInfo('Message queue connection established successfully');
  } catch (error) {
    isConnecting = false;
    logError('Failed to initialize message queue', error);
    
    // Attempt to reconnect after timeout
    setTimeout(initializeMessageQueue, RECONNECT_TIMEOUT);
  }
}

/**
 * Set up all required queues with appropriate configurations
 */
async function setupQueues(): Promise<void> {
  if (!channel) return;
  
  // Configure each queue with appropriate settings
  await channel.assertQueue(QueueName.AI_PROCESSING, {
    durable: true,
    maxPriority: 10
  });
  
  await channel.assertQueue(QueueName.EMAIL_NOTIFICATIONS, {
    durable: true
  });
  
  await channel.assertQueue(QueueName.DATA_EXPORTS, {
    durable: true
  });
  
  await channel.assertQueue(QueueName.PLATFORM_SYNC, {
    durable: true
  });
  
  await channel.assertQueue(QueueName.ANALYTICS_PROCESSING, {
    durable: true
  });
  
  // Set prefetch to ensure fair distribution among worker instances
  await channel.prefetch(1);
}

/**
 * Handle connection errors
 */
function handleConnectionError(error: any): void {
  logError('Message queue connection error', error);
  
  // Attempt to reconnect
  setTimeout(initializeMessageQueue, RECONNECT_TIMEOUT);
}

/**
 * Handle connection closure
 */
function handleConnectionClosed(): void {
  logInfo('Message queue connection closed');
  
  // Attempt to reconnect
  setTimeout(initializeMessageQueue, RECONNECT_TIMEOUT);
}

/**
 * Publish a message to the specified queue
 */
export async function publishMessage<T>(
  queueName: QueueName,
  taskType: TaskType,
  payload: T,
  metadata: Partial<QueueMessage['metadata']> = {},
  priority: number = 5
): Promise<boolean> {
  try {
    // Reconnect if needed
    if (!channel) {
      await initializeMessageQueue();
      if (!channel) {
        throw new Error('Message queue channel not available');
      }
    }
    
    // Prepare the message
    const message: QueueMessage<T> = {
      taskType,
      priority,
      payload,
      metadata: {
        userId: metadata.userId || 'anonymous',
        organizationId: metadata.organizationId || 'system',
        timestamp: Date.now(),
        requestId: metadata.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    };
    
    // Publish the message
    return channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        priority
      }
    );
  } catch (error) {
    logError(`Failed to publish message to queue ${queueName}`, error);
    return false;
  }
}

/**
 * Consume messages from the specified queue
 */
export async function consumeMessages<T>(
  queueName: QueueName,
  handler: (message: QueueMessage<T>) => Promise<void>
): Promise<void> {
  try {
    // Reconnect if needed
    if (!channel) {
      await initializeMessageQueue();
      if (!channel) {
        throw new Error('Message queue channel not available');
      }
    }
    
    // Set up the consumer
    await channel.consume(queueName, async (msg) => {
      if (!msg) return;
      
      try {
        // Parse the message
        const messageContent = JSON.parse(msg.content.toString()) as QueueMessage<T>;
        
        // Process the message
        await handler(messageContent);
        
        // Acknowledge the message
        channel?.ack(msg);
      } catch (error) {
        logError(`Error processing message from queue ${queueName}`, error);
        
        // Reject the message and requeue it
        channel?.nack(msg, false, true);
      }
    });
    
    logInfo(`Consumer registered for queue ${queueName}`);
  } catch (error) {
    logError(`Failed to set up consumer for queue ${queueName}`, error);
    
    // Attempt to reconnect after timeout
    setTimeout(() => consumeMessages(queueName, handler), RECONNECT_TIMEOUT);
  }
}

/**
 * Close the message queue connection
 */
export async function closeMessageQueue(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
    }
    
    if (connection) {
      await connection.close();
    }
    
    channel = null;
    connection = null;
    
    logInfo('Message queue connection closed successfully');
  } catch (error) {
    logError('Error closing message queue connection', error);
  }
}