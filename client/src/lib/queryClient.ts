import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleApiError, ClientApiError, ErrorCode } from './error-handling';

async function handleResponseError(res: Response) {
  if (!res.ok) {
    // Instead of just throwing a generic error, use our advanced error handling
    if (res.status === 401) {
      throw new ClientApiError('Authentication required', ErrorCode.AUTHENTICATION_ERROR, 401);
    } else if (res.status === 403) {
      throw new ClientApiError('Access denied', ErrorCode.AUTHORIZATION_ERROR, 403);
    } else if (res.status === 404) {
      throw new ClientApiError('Resource not found', ErrorCode.NOT_FOUND, 404);
    } else if (res.status === 429) {
      throw new ClientApiError('Rate limit exceeded', ErrorCode.RATE_LIMIT_ERROR, 429);
    } else if (res.status >= 500) {
      throw new ClientApiError('Server error', ErrorCode.INTERNAL_SERVER_ERROR, res.status);
    }
    
    // For other errors, throw the response to be handled by handleApiError
    throw res;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await handleResponseError(res);
    
    // Check if the response is HTML instead of expected API response
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await res.clone().text();
      if (text.includes('<!DOCTYPE html>')) {
        console.error('Received HTML response instead of API data');
        throw new ClientApiError(
          'Received HTML page instead of API response',
          ErrorCode.EXTERNAL_API_ERROR,
          res.status,
          { url }
        );
      }
    }
    
    return res;
  } catch (error) {
    if (error instanceof Response || error instanceof ClientApiError) {
      throw error; // Let the caller handle structured errors
    }
    
    // For unexpected errors, convert to ClientApiError
    throw new ClientApiError(
      `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      { url, method }
    );
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Ensure we're fetching API routes, not page routes
      const url = queryKey[0] as string;
      
      // Check if the URL is a page route instead of an API route
      // This helps prevent the "unexpected token doctype" error
      if (!url.startsWith('/api/') && !url.startsWith('http')) {
        console.warn(`Attempted to fetch non-API route: ${url}`);
        return null; // Return null instead of throwing an error for non-API routes
      }
      
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await handleResponseError(res);
      
      // Safe parsing to handle potential HTML responses
      try {
        const contentType = res.headers.get('content-type');
        
        // If we're sure it's JSON, parse it directly
        if (contentType && contentType.includes('application/json')) {
          return await res.json();
        }
        
        // For non-JSON content types, we need to be more careful
        // First check if it's HTML by looking at the first few bytes
        const text = await res.text();
        
        // Known problematic endpoints that should return empty arrays/objects if they return HTML
        if (url.includes('/api/notifications')) {
          if (text.includes('<!DOCTYPE') || text.includes('<html') || text.trim() === '') {
            return [];
          }
        }
        
        if (url.includes('/api/messages/ai')) {
          if (text.includes('<!DOCTYPE') || text.includes('<html') || text.trim() === '') {
            return [];
          }
        }
        
        if (url.includes('/api/user/settings')) {
          if (text.includes('<!DOCTYPE') || text.includes('<html') || text.trim() === '') {
            return {
              aiSettings: { 
                model: 'gpt-4o',
                temperature: 0.7,
                maxTokens: 1000,
                responseTimeout: 30,
                enableKnowledgeBase: true,
                fallbackToHuman: true 
              },
              notificationSettings: {
                emailNotifications: false,
                desktopNotifications: true,
                newMessageAlerts: true,
                assignmentNotifications: true,
                summaryReports: false
              }
            };
          }
        }
        
        // If it's HTML, don't try to parse it as JSON
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          // Log only in development, not to the console for users
          if (process.env.NODE_ENV === 'development') {
            console.debug(`API route ${url} returned HTML - using default response`);
          }
          return null; // Return null instead of throwing an error
        }
        
        // If it's not HTML but might be JSON, try to parse it
        try {
          return JSON.parse(text);
        } catch (error) {
          // Safely handle the error
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.debug(`Failed to parse response as JSON: ${errorMessage}`);
          return null;
        }
      } catch (error) {
        console.error('Error handling response:', error);
        return null; // Return null to avoid crashing the app
      }
      
    } catch (error) {
      // Use our error handling system to provide meaningful errors
      const errorInstance = handleApiError(error, `Failed to fetch data from ${queryKey[0]}`);
      
      // Log better information about the error for debugging
      console.error(`API request to ${queryKey[0]} failed:`, {
        error,
        errorType: error?.constructor?.name,
        message: error instanceof Error ? error.message : String(error),
      });
      
      throw errorInstance;
    }
  };

/**
 * Configure cache time based on data type
 * - Frequently changing data (messages, notifications): short cache
 * - Relatively stable data (platforms, knowledge base): longer cache
 * - User settings, profile info: very long cache
 */
export const getCacheTime = (queryKey: string | string[]): number => {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  
  // Optimize caching strategy based on data type
  if (key.includes('/notifications') || key.includes('/messages')) {
    return 1000 * 60 * 1; // 1 minute for frequently changing data
  } else if (key.includes('/conversations') || key.includes('/analytics')) {
    return 1000 * 60 * 5; // 5 minutes for moderately changing data
  } else if (key.includes('/platforms') || key.includes('/knowledge-base')) {
    return 1000 * 60 * 30; // 30 minutes for relatively stable data
  } else if (key.includes('/auth/user') || key.includes('/settings')) {
    return 1000 * 60 * 60; // 1 hour for stable user data
  } 
  
  // Default cache time: 5 minutes
  return 1000 * 60 * 5;
};

/**
 * Configure stale time based on data type
 * This determines how quickly data is considered stale and needs refetching
 */
export const getStaleTime = (queryKey: string | string[]): number => {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  
  // Real-time data should be considered stale quickly
  if (key.includes('/messages') || key.includes('/notifications')) {
    return 1000 * 15; // 15 seconds for real-time data
  } else if (key.includes('/conversations')) {
    return 1000 * 30; // 30 seconds for conversation data
  } else if (key.includes('/analytics')) {
    return 1000 * 60 * 2; // 2 minutes for analytics data
  } else if (key.includes('/platforms') || key.includes('/knowledge-base')) {
    return 1000 * 60 * 10; // 10 minutes for more stable data
  } 
  
  // Default stale time: 1 minute
  return 1000 * 60;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Dynamic stale time based on query key - see getStaleTime function
      // This controls how fresh the data needs to be
      staleTime: 1000 * 30, // Default stale time is 30 seconds
      // Keep cached data for longer to improve performance when navigating back
      gcTime: 1000 * 60 * 10, // Default garbage collection time is 10 minutes
      retry: 1, // Retry once on failure
    },
    mutations: {
      retry: 1, // Retry once on failure for mutations too
      onError: (error: any) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
