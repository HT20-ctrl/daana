/**
 * Worker Process Startup Script
 * 
 * This script starts the worker process to handle asynchronous tasks
 * through the message queue system.
 */

import { startWorkerProcess } from './workers/workerProcess';
import { logInfo } from './utils/logger';

// Log startup information
logInfo('Starting Dana AI worker process', {
  nodeEnv: process.env.NODE_ENV,
  workerCount: process.env.WORKER_CONCURRENCY || '1'
});

// Start the worker process
startWorkerProcess()
  .then(() => {
    logInfo('Dana AI worker process initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to start worker process:', error);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in worker process:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in worker process:', reason);
  process.exit(1);
});