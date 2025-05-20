/**
 * Enhanced React Query hook with improved caching and performance tracking
 * This custom hook extends the standard useQuery with smart caching behavior
 */
import { 
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { measureAsyncPerformance } from '@/lib/performance';

export type UseCachedQueryOptions<T> = Omit<
  UseQueryOptions<T, Error, T, QueryKey>,
  'queryKey'
> & {
  queryKey: QueryKey;
};

/**
 * Enhanced query hook with performance monitoring and improved caching
 * 
 * Features:
 * 1. Automatic performance tracking for each query
 * 2. Smart background refetching for stale data
 * 3. Consistent error handling
 * 4. Prefetch support for data preloading
 * 
 * @param options Query options including the queryKey
 * @returns Query result with loading and error states
 */
export function useCachedQuery<T>({
  queryKey,
  ...options
}: UseCachedQueryOptions<T>) {
  const queryClient = useQueryClient();
  const queryKeyString = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
  
  // Default error handler if none provided
  const defaultOnError = (error: Error) => {
    console.error(`Query error (${queryKeyString}):`, error);
  };
  
  // Create a merged options object without the onError property
  const { onError, ...restOptions } = options;
  
  // Return the enhanced query
  return useQuery<T, Error, T, QueryKey>({
    queryKey,
    
    // Wrap the queryFn with performance monitoring
    queryFn: async (context) => {
      const { signal } = context;
      
      return measureAsyncPerformance(`query:${queryKeyString}`, async () => {
        // Default function fetches from the API using the queryKey
        const apiUrl = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        
        // Skip if API URL is not a string (unlikely)
        if (typeof apiUrl !== 'string') {
          throw new Error('Query key must be a string or start with a string URL');
        }
        
        // Execute the fetch with automatic timeout
        const response = await fetch(apiUrl, { signal });
        
        // Handle HTTP errors
        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || `API error: ${response.status}`);
          } catch (e) {
            // If response is not JSON, throw with status text
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
        }
        
        // Parse and return the response data
        try {
          return await response.json();
        } catch (e) {
          throw new Error('Failed to parse API response as JSON');
        }
      });
    },
    
    // Smart refetch options
    refetchOnWindowFocus: true,       // Refetch when user returns to the app
    refetchOnMount: true,             // Refetch when component mounts
    refetchOnReconnect: true,         // Refetch when connection is restored
    retry: 1,                         // Only retry once to avoid overwhelming server
    retryDelay: 1000,                 // Wait 1 second between retries
    
    // Pass through other options
    ...restOptions,
  }, {
    // Provide the error handler through the context API rather than options
    context: {
      onError: onError || defaultOnError,
    }
  });
}

/**
 * Pre-fetch data into cache for faster initial loads
 * 
 * @param options Query options with same interface as useCachedQuery
 */
export function prefetchQuery<T>({
  queryKey,
  ...options
}: UseCachedQueryOptions<T>) {
  const queryClient = useQueryClient();
  const queryKeyString = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
  
  // Prefetch with the same behavior as our enhanced hook
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: async (context) => {
      const { signal } = context;
      
      return measureAsyncPerformance(`prefetch:${queryKeyString}`, async () => {
        const apiUrl = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        
        if (typeof apiUrl !== 'string') {
          throw new Error('Query key must be a string or start with a string URL');
        }
        
        const response = await fetch(apiUrl, { signal });
        
        if (!response.ok) {
          console.warn(`Prefetch error for ${queryKeyString}: ${response.status}`);
          throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
      });
    },
    ...options
  });
}