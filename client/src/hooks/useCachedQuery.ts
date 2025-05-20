/**
 * Enhanced cached query hook with optimized data fetching
 * This hook extends React Query with smart caching strategies
 */
import { useQuery, UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, getCacheTime } from '@/lib/queryClient';
import { useEffect, useState } from 'react';

interface UseCachedQueryOptions<T> extends UseQueryOptions<T> {
  prefetch?: boolean; // Whether to prefetch this data
  refreshInterval?: number; // Custom refresh interval
  keepPreviousData?: boolean; // Keep previous data while fetching
}

/**
 * Enhanced query hook with smart caching strategies
 * 
 * Features:
 * - Automatic cache time optimization based on data type
 * - Stale-while-revalidate pattern for fresh data without loading states
 * - Optional prefetching for critical data
 * - Smart background refreshing
 * 
 * @param queryKey The query key for React Query
 * @param options Additional options for the query
 * @returns The query result with enhanced caching
 */
export function useCachedQuery<T = unknown>(
  queryKey: string | string[],
  options?: UseCachedQueryOptions<T>
) {
  const queryClient = useQueryClient();
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Calculate optimized cache times based on data type
  const cacheTime = getCacheTime(queryKey);
  
  // Set stale time based on data type - more frequently changing data has shorter stale time
  const calculateStaleTime = () => {
    if (options?.staleTime) return options.staleTime;
    
    const mainKey = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    
    // Different stale times for different data types
    if (mainKey.includes('/messages') || mainKey.includes('/notifications')) {
      return 1000 * 15; // 15 seconds for highly dynamic data
    } else if (mainKey.includes('/conversations')) {
      return 1000 * 30; // 30 seconds for moderately changing data
    } else if (mainKey.includes('/platforms') || mainKey.includes('/analytics')) {
      return 1000 * 60; // 1 minute for more stable data
    } else if (mainKey.includes('/auth/user') || mainKey.includes('/settings')) {
      return 1000 * 60 * 5; // 5 minutes for very stable data
    }
    
    // Default stale time is 30 seconds
    return 1000 * 30;
  };
  
  // Prefetch data if needed
  useEffect(() => {
    if (options?.prefetch && isInitialLoad) {
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: getQueryFn({ on401: 'throw' }),
        staleTime: calculateStaleTime(),
      });
      setIsInitialLoad(false);
    }
  }, [queryClient, key, options?.prefetch, isInitialLoad]);
  
  // Use React Query with our optimized settings
  return useQuery<T>({
    queryKey: key,
    queryFn: getQueryFn({ on401: 'throw' }),
    staleTime: calculateStaleTime(),
    gcTime: cacheTime,
    refetchInterval: options?.refreshInterval,
    keepPreviousData: options?.keepPreviousData ?? true,
    ...options,
  });
}

/**
 * Use this hook for critical data that should be prefetched
 * This improves perceived performance for important UI elements
 */
export function usePrefetchedQuery<T = unknown>(
  queryKey: string | string[],
  options?: Omit<UseCachedQueryOptions<T>, 'prefetch'>
) {
  return useCachedQuery<T>(queryKey, { ...options, prefetch: true });
}