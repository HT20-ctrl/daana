import { Router, Request, Response, NextFunction } from 'express';
import { ApiError, asyncHandler } from '../errorHandling';

// Router to test different error scenarios
const errorTestRouter = Router();

// Test route for validation errors
errorTestRouter.get('/validation', (req, res, next) => {
  next(ApiError.validationError('Validation error test', { field: 'test', message: 'Invalid value' }));
});

// Test route for authentication errors
errorTestRouter.get('/authentication', (req, res, next) => {
  next(ApiError.authenticationError('Authentication error test'));
});

// Test route for not found errors
errorTestRouter.get('/not-found', (req, res, next) => {
  next(ApiError.notFound('Resource not found test'));
});

// Test route for database errors
errorTestRouter.get('/database', (req, res, next) => {
  next(ApiError.databaseError('Database error test', { operation: 'select', table: 'users' }));
});

// Test route for external API errors
errorTestRouter.get('/external-api', (req, res, next) => {
  next(ApiError.externalApiError('External API error test', { service: 'facebook', endpoint: '/users' }));
});

// Test route for internal server errors
errorTestRouter.get('/internal', (req, res, next) => {
  next(ApiError.internal('Internal server error test'));
});

// Test route for async errors (using asyncHandler)
errorTestRouter.get('/async', asyncHandler(async (req, res, next) => {
  // Simulate an async operation that fails
  await new Promise(resolve => setTimeout(resolve, 100));
  throw new Error('Async error test');
}));

// Test route for uncaught errors
errorTestRouter.get('/uncaught', (req, res, next) => {
  // This will trigger the default error handler
  throw new Error('Uncaught error test');
});

export default errorTestRouter;