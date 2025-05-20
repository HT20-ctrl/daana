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
      
      // Check the content type before trying to parse as JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          return await res.json();
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          // Try to get the text to see if it's actually HTML
          const text = await res.clone().text();
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            throw new ClientApiError(
              'Received HTML instead of JSON response',
              ErrorCode.EXTERNAL_API_ERROR,
              res.status,
              { previewText: text.substring(0, 100) }
            );
          } else {
            throw new ClientApiError(
              'Invalid JSON response from server',
              ErrorCode.EXTERNAL_API_ERROR,
              res.status,
              { responseText: text.substring(0, 100) }
            );
          }
        }
      } else {
        // If the response is not JSON, throw a more helpful error
        const text = await res.text();
        const previewText = text.substring(0, 100);
        throw new ClientApiError(
          `Expected JSON response but received ${contentType || 'unknown content type'}`,
          ErrorCode.EXTERNAL_API_ERROR,
          res.status,
          { previewText }
        );
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
