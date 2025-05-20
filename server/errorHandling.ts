import { Request, Response, NextFunction } from 'express';

// Define error types and codes
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

// Standard ApiError class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;

  constructor(message: string, statusCode: number, code: ErrorCode, context?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  // Standard API errors factory methods
  static validationError(message: string, context?: Record<string, any>): ApiError {
    return new ApiError(message, 400, ErrorCode.VALIDATION_ERROR, context);
  }

  static authenticationError(message: string = 'Authentication required', context?: Record<string, any>): ApiError {
    return new ApiError(message, 401, ErrorCode.AUTHENTICATION_ERROR, context);
  }

  static authorizationError(message: string = 'Insufficient permissions', context?: Record<string, any>): ApiError {
    return new ApiError(message, 403, ErrorCode.AUTHORIZATION_ERROR, context);
  }

  static notFound(message: string = 'Resource not found', context?: Record<string, any>): ApiError {
    return new ApiError(message, 404, ErrorCode.NOT_FOUND, context);
  }

  static rateLimitExceeded(message: string = 'Rate limit exceeded', context?: Record<string, any>): ApiError {
    return new ApiError(message, 429, ErrorCode.RATE_LIMIT_ERROR, context);
  }

  static externalApiError(message: string, context?: Record<string, any>): ApiError {
    return new ApiError(message, 502, ErrorCode.EXTERNAL_API_ERROR, context);
  }

  static databaseError(message: string, context?: Record<string, any>): ApiError {
    return new ApiError(message, 500, ErrorCode.DATABASE_ERROR, context);
  }

  static internal(message: string = 'Internal server error', context?: Record<string, any>): ApiError {
    return new ApiError(message, 500, ErrorCode.INTERNAL_SERVER_ERROR, context);
  }
}

// Global error handler middleware
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log the error with severity based on type
  const isProduction = process.env.NODE_ENV === 'production';
  
  // If it's our ApiError, use its status code
  if (err instanceof ApiError) {
    const errorResponse = {
      message: err.message,
      code: err.code,
      ...(isProduction ? {} : { context: err.context, stack: err.stack }),
    };
    
    // Log the error with appropriate severity based on status code
    if (err.statusCode >= 500) {
      logger.error(`${err.code}: ${err.message}`, { 
        path: req.path, 
        method: req.method,
        context: err.context,
        stack: err.stack,
      });
    } else if (err.statusCode >= 400) {
      logger.warn(`${err.code}: ${err.message}`, { 
        path: req.path, 
        method: req.method,
        context: err.context,
      });
    }
    
    return res.status(err.statusCode).json(errorResponse);
  } 
  
  // For CSRF errors
  if (err.name === 'EBADCSRFTOKEN') {
    logger.warn(`CSRF attack detected`, { 
      path: req.path, 
      method: req.method,
      ip: req.ip,
    });
    
    return res.status(403).json({
      message: 'Invalid form submission. Please refresh the page and try again.',
      code: 'CSRF_ERROR',
    });
  }
  
  // For other unexpected errors
  logger.error(`Unhandled Error: ${err.message}`, { 
    path: req.path, 
    method: req.method,
    stack: err.stack,
  });
  
  // Don't leak error details in production
  return res.status(500).json({
    message: isProduction ? 'Internal server error' : err.message,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

// Custom async handler to avoid try/catch blocks
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Centralized logging service
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, meta);
    // Here we could integrate with external logging services
  },
  
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, meta);
    // Here we could integrate with external logging services
  },
  
  error: (message: string, meta?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, meta);
    // Here we could integrate with external logging services or error tracking
    // For example, if using Sentry:
    // if (Sentry.isInitialized()) {
    //   Sentry.captureException(new Error(message), { extra: meta });
    // }
  },
  
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }
};

// Health check middleware for system monitoring
export function healthCheckEndpoint(req: Request, res: Response) {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
  
  res.json(healthStatus);
}