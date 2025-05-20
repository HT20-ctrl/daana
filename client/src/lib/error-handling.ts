import { toast } from '@/hooks/use-toast';

// Error types that match our backend
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

// Error response structure matches the backend ApiError format
export interface ApiErrorResponse {
  message: string;
  code: ErrorCode;
  context?: Record<string, any>;
}

// Client-side API error
export class ClientApiError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;
  public readonly status: number;

  constructor(message: string, code: ErrorCode, status: number, context?: Record<string, any>) {
    super(message);
    this.code = code;
    this.status = status;
    this.context = context;
    this.name = 'ClientApiError';
  }
}

/**
 * Handles API errors and provides appropriate UI feedback
 */
export function handleApiError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): ClientApiError {
  console.error('API Error:', error);
  
  // Parse the error and extract relevant information
  let errorMessage = defaultMessage;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let statusCode = 500;
  let errorContext: Record<string, any> | undefined;
  
  // Check if it's a response with JSON error structure
  if (error instanceof Response || (error as any)?.json) {
    // Try to extract JSON error details
    try {
      const response = error as Response;
      statusCode = response.status;
      
      // For synchronous handling (create a new error rather than returning a promise)
      const errorObj = new ClientApiError(
        response.statusText || defaultMessage,
        statusCode === 400 ? ErrorCode.VALIDATION_ERROR :
        statusCode === 401 ? ErrorCode.AUTHENTICATION_ERROR :
        statusCode === 403 ? ErrorCode.AUTHORIZATION_ERROR :
        statusCode === 404 ? ErrorCode.NOT_FOUND :
        statusCode === 429 ? ErrorCode.RATE_LIMIT_ERROR :
        ErrorCode.INTERNAL_SERVER_ERROR,
        statusCode
      );
      
      // Display appropriate toast notification based on error type
      showErrorToast(errorObj.code, errorObj.message);
      
      // Return the error immediately
      return errorObj;
    } catch (e) {
      console.error('Error parsing API error:', e);
    }
  }
  
  // If the error is already a ClientApiError, use it directly
  if (error instanceof ClientApiError) {
    showErrorToast(error.code, error.message);
    return error;
  }
  
  // For other error types, try to extract meaningful information
  if (error instanceof Error) {
    errorMessage = error.message || defaultMessage;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  showErrorToast(errorCode, errorMessage);
  return new ClientApiError(errorMessage, errorCode, statusCode);
}

/**
 * Display an appropriate toast notification based on error type
 */
function showErrorToast(errorCode: ErrorCode, message: string) {
  let title = 'Error';
  let variant: 'default' | 'destructive' = 'destructive';
  
  switch (errorCode) {
    case ErrorCode.VALIDATION_ERROR:
      title = 'Validation Error';
      break;
      
    case ErrorCode.AUTHENTICATION_ERROR:
      title = 'Authentication Required';
      // Might redirect to login page here
      break;
      
    case ErrorCode.AUTHORIZATION_ERROR:
      title = 'Access Denied';
      break;
      
    case ErrorCode.NOT_FOUND:
      title = 'Not Found';
      variant = 'default';
      break;
      
    case ErrorCode.RATE_LIMIT_ERROR:
      title = 'Too Many Requests';
      break;
      
    case ErrorCode.EXTERNAL_API_ERROR:
      title = 'External Service Error';
      break;
      
    case ErrorCode.DATABASE_ERROR:
      title = 'Database Error';
      break;
      
    case ErrorCode.INTERNAL_SERVER_ERROR:
    default:
      title = 'Server Error';
      break;
  }
  
  toast({
    title,
    description: message,
    variant,
  });
}

/**
 * Custom error boundary component for React
 * To be used with React's ErrorBoundary feature
 */
export function logErrorToService(error: Error, componentStack: string = '') {
  // In a production app, we would send this to an error tracking service like Sentry
  console.error('Application Error:', error);
  if (componentStack) {
    console.error('Component Stack:', componentStack);
  }
  
  // For a real implementation, uncomment and configure Sentry:
  /*
  Sentry.captureException(error, {
    extra: {
      componentStack,
    },
  });
  */
}