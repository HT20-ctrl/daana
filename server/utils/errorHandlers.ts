import { Request, Response, NextFunction } from 'express';
import { ApiError, asyncHandler } from '../errorHandling';

/**
 * Utility function to handle platform authentication errors
 */
export function handlePlatformAuthError(platform: string, err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`${platform} authentication error:`, err);
  
  // Convert common OAuth errors to our standard error format
  if (err.code === 'invalid_grant') {
    return next(ApiError.authenticationError(`${platform} authentication expired or invalid`, {
      platform,
      errorCode: err.code,
      errorMessage: err.message
    }));
  }
  
  if (err.status === 401 || err.statusCode === 401) {
    return next(ApiError.authenticationError(`${platform} authentication required`, {
      platform,
      errorCode: err.code,
      errorMessage: err.message
    }));
  }
  
  // For other errors related to external API
  return next(ApiError.externalApiError(`${platform} API error: ${err.message}`, {
    platform,
    errorCode: err.code || 'unknown_error',
    errorMessage: err.message
  }));
}

/**
 * Wrapper for platform connection handlers
 */
export function createPlatformConnectionHandler(
  platformName: string,
  connectionFunction: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await connectionFunction(req, res, next);
    } catch (err) {
      handlePlatformAuthError(platformName, err, req, res, next);
    }
  });
}

/**
 * Wrapper for platform API handlers
 */
export function createPlatformApiHandler(
  platformName: string,
  apiFunction: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await apiFunction(req, res, next);
    } catch (err) {
      // Check for specific API errors
      if (err.code === 'platform_not_connected') {
        return next(ApiError.authenticationError(`${platformName} is not connected`, {
          platform: platformName,
          errorCode: err.code,
          errorMessage: err.message
        }));
      }
      
      if (err.code === 'rate_limit_exceeded') {
        return next(ApiError.rateLimitExceeded(`${platformName} rate limit exceeded`, {
          platform: platformName,
          errorCode: err.code,
          errorMessage: err.message
        }));
      }
      
      // For other API errors
      handlePlatformAuthError(platformName, err, req, res, next);
    }
  });
}

/**
 * Utility function to handle database errors
 */
export function handleDatabaseError(operation: string, err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`Database error in ${operation}:`, err);
  
  // Convert common DB errors to our standard error format
  if (err.code === 'P2025') {
    // Prisma not found error
    return next(ApiError.notFound(`Resource not found: ${err.meta?.target || 'unknown'}`, {
      operation,
      errorCode: err.code,
      errorMessage: err.message
    }));
  }
  
  if (err.code === 'P2002') {
    // Prisma unique constraint error
    return next(ApiError.validationError(`Duplicate entry: ${err.meta?.target?.join(', ') || 'unknown field'}`, {
      operation,
      errorCode: err.code,
      errorMessage: err.message
    }));
  }
  
  // For other database errors
  return next(ApiError.databaseError(`Database error: ${err.message}`, {
    operation,
    errorCode: err.code || 'unknown_error',
    errorMessage: err.message
  }));
}

/**
 * Wrapper for database operations
 */
export function createDatabaseHandler(
  operation: string,
  dbFunction: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbFunction(req, res, next);
    } catch (err) {
      handleDatabaseError(operation, err, req, res, next);
    }
  });
}