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
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
