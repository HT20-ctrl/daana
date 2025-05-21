/**
 * Logger Utility for Dana AI
 * 
 * This module provides standardized logging functions for the application,
 * supporting different log levels and formats.
 */

// Log levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Environment-based log level
const LOG_LEVEL = (process.env.LOG_LEVEL || 'INFO').toUpperCase();

// Default metadata for all logs
const DEFAULT_METADATA = {
  service: 'dana-ai',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0'
};

/**
 * Format log entry as JSON
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  metadata?: Record<string, any>,
  error?: any
): string {
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    level,
    message,
    ...DEFAULT_METADATA,
    ...metadata
  };
  
  if (error) {
    logEntry['error'] = {
      name: error.name || 'Error',
      message: error.message,
      stack: error.stack,
      ...(error.response ? { response: error.response.data } : {})
    };
  }
  
  return JSON.stringify(logEntry);
}

/**
 * Check if the log should be displayed based on log level
 */
function shouldLog(level: LogLevel): boolean {
  const levels = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3
  };
  
  return levels[level] <= levels[LOG_LEVEL as LogLevel];
}

/**
 * Log an error message
 */
export function logError(
  message: string,
  error?: any,
  metadata?: Record<string, any>
): void {
  if (shouldLog(LogLevel.ERROR)) {
    console.error(formatLogEntry(LogLevel.ERROR, message, metadata, error));
  }
}

/**
 * Log a warning message
 */
export function logWarn(
  message: string,
  metadata?: Record<string, any>
): void {
  if (shouldLog(LogLevel.WARN)) {
    console.warn(formatLogEntry(LogLevel.WARN, message, metadata));
  }
}

/**
 * Log an info message
 */
export function logInfo(
  message: string,
  metadata?: Record<string, any>
): void {
  if (shouldLog(LogLevel.INFO)) {
    console.info(formatLogEntry(LogLevel.INFO, message, metadata));
  }
}

/**
 * Log a debug message
 */
export function logDebug(
  message: string,
  metadata?: Record<string, any>
): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.debug(formatLogEntry(LogLevel.DEBUG, message, metadata));
  }
}

/**
 * Log an API request
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  metadata?: Record<string, any>
): void {
  logInfo(`${method} ${path} ${statusCode} ${responseTime}ms`, {
    type: 'api_request',
    method,
    path,
    statusCode,
    responseTime,
    ...metadata
  });
}

/**
 * Create a request logger middleware for Express
 */
export function createRequestLogger() {
  return (req: any, res: any, next: () => void) => {
    const start = Date.now();
    
    const logResponse = () => {
      const responseTime = Date.now() - start;
      logApiRequest(
        req.method,
        req.path,
        res.statusCode,
        responseTime,
        {
          query: req.query,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          userId: req.user?.id,
          organizationId: req.headers['x-organization-id'],
          requestId: req.headers['x-request-id']
        }
      );
    };
    
    res.on('finish', logResponse);
    next();
  };
}