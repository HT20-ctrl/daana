import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClientApiError, ErrorCode, handleApiError } from '@/lib/error-handling';
import { useLocation } from 'wouter';

/**
 * Custom hook for handling errors in a consistent way across the application
 * Provides standard error handling behaviors based on error type
 */
export function useErrorHandler() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const handleError = useCallback((error: unknown, options?: {
    defaultMessage?: string;
    onAuthError?: () => void;
    onNotFound?: () => void;
  }) => {
    // Use our global error handler first
    const apiError = (error instanceof ClientApiError) 
      ? error 
      : handleApiError(error, options?.defaultMessage);
    
    // Handle specific error types with custom behavior
    switch (apiError.code) {
      case ErrorCode.AUTHENTICATION_ERROR:
        // Handle authentication errors (e.g., redirect to login)
        if (options?.onAuthError) {
          options.onAuthError();
        } else {
          // Default behavior: redirect to login
          setLocation('/login');
        }
        break;
        
      case ErrorCode.NOT_FOUND:
        // Handle not found errors (e.g., redirect to 404 page)
        if (options?.onNotFound) {
          options.onNotFound();
        } else {
          // Default behavior: show toast and stay on page
          toast({
            title: 'Not Found',
            description: apiError.message,
            variant: 'destructive',
          });
        }
        break;
        
      default:
        // For other errors, the default behavior in handleApiError is sufficient
        break;
    }
    
    return apiError;
  }, [toast, setLocation]);
  
  return { handleError };
}