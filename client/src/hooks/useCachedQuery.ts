/**
 * Enhanced React Query hook with improved caching and performance tracking
 */
import { 
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { measureAsyncPerformance } from '@/lib/performance';

/**
 * Enhanced query hook with performance monitoring and improved caching
 */
export function useCachedQuery<TData = unknown>(
  queryKey: QueryKey,
  options: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey'> = {}
) {
  const queryClient = useQueryClient();
  const queryKeyString = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
  
  // Create a default queryFn
  const defaultQueryFn = async (context: any) => {
    const { signal } = context;
    
    return measureAsyncPerformance(`query:${queryKeyString}`, async () => {
      // Default function fetches from the API using the queryKey
      const apiUrl = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      
      if (typeof apiUrl !== 'string') {
        throw new Error('Query key must be a string or start with a string URL');
      }
      
      const response = await fetch(apiUrl, { signal });
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `API error: ${response.status}`);
        } catch (e) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }
      
      try {
        return await response.json();
      } catch (e) {
        throw new Error('Failed to parse API response as JSON');
      }
    });
  };
  
  return useQuery<TData, Error, TData, QueryKey>({
    queryKey,
    queryFn: options.queryFn || defaultQueryFn,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Pre-fetch data into cache for faster initial loads
 */
export function prefetchQuery<TData = unknown>(
  queryKey: QueryKey,
  options: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey'> = {}
) {
  const queryClient = useQueryClient();
  const queryKeyString = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
  
  const defaultQueryFn = async (context: any) => {
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
  };
  
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: options.queryFn || defaultQueryFn,
    ...options
  });
}