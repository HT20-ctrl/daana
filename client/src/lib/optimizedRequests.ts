/**
 * Optimized request helpers with performance monitoring
 * These provide enhanced caching and performance tracking for common API calls
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { measureAsyncPerformance } from './performance';

// Constants for cache durations
const SHORT_CACHE_TIME = 30 * 1000; // 30 seconds for frequently updated data
const MEDIUM_CACHE_TIME = 5 * 60 * 1000; // 5 minutes for semi-static data
const LONG_CACHE_TIME = 30 * 60 * 1000; // 30 minutes for mostly static data

/**
 * Get platforms with optimized caching
 * Platforms are cached for 5 minutes but re-fetched in the background
 */
export function useOptimizedPlatforms() {
  return useCachedQuery({
    queryKey: ['/api/platforms'],
    staleTime: MEDIUM_CACHE_TIME,
    gcTime: MEDIUM_CACHE_TIME,
    onSuccess: (data) => {
      console.log('[Optimized] Platforms loaded:', data.length);
    }
  });
}

/**
 * Create a new platform with optimized error handling and cache invalidation
 */
export function useCreatePlatform() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (platformData: any) => {
      return await measureAsyncPerformance('createPlatform', async () => {
        const response = await fetch('/api/platforms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(platformData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create platform');
        }
        
        return await response.json();
      });
    },
    onSuccess: () => {
      // Invalidate the platforms cache to show the new platform
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
    },
  });
}

/**
 * Get conversations with dynamic cache time based on active status
 * Active conversations get shorter cache times to stay more up-to-date
 */
export function useOptimizedConversations() {
  const { user } = useAuth();
  
  return useCachedQuery({
    queryKey: ['/api/conversations'],
    staleTime: SHORT_CACHE_TIME, // Conversations change frequently
    gcTime: MEDIUM_CACHE_TIME, // But we can keep cache a bit longer
    enabled: !!user,
    onSuccess: (data) => {
      // If there are active conversations, decrease stale time
      if (data.some((conv: any) => conv.isActive)) {
        // Background refresh will happen more often for active conversations
        queryClient.setQueryDefaults(['/api/conversations'], {
          staleTime: SHORT_CACHE_TIME / 2,
        });
      }
    }
  });
}

/**
 * Get a single conversation with optimized caching
 */
export function useOptimizedConversation(conversationId: number) {
  const { user } = useAuth();
  
  return useCachedQuery({
    queryKey: ['/api/conversations', conversationId],
    staleTime: SHORT_CACHE_TIME, // Single conversation view should be fresh
    gcTime: MEDIUM_CACHE_TIME, 
    enabled: !!user && !!conversationId,
    onSuccess: (data) => {
      // If the conversation is active, reduce the stale time even more
      if (data?.isActive) {
        queryClient.setQueryDefaults(['/api/conversations', conversationId], {
          staleTime: SHORT_CACHE_TIME / 4, // Very short stale time for active conversations
        });
      }
    }
  });
}

/**
 * Get conversation messages with optimized caching
 * Messages have shorter cache times to stay current
 */
export function useOptimizedMessages(conversationId: number) {
  const { user } = useAuth();
  
  return useCachedQuery({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    staleTime: SHORT_CACHE_TIME / 2, // Messages change very frequently
    gcTime: MEDIUM_CACHE_TIME,
    enabled: !!user && !!conversationId,
    onSuccess: (data) => {
      // Update the conversation preview if we have messages
      if (data && data.length > 0) {
        queryClient.setQueryData(['/api/conversations'], (oldData: any) => {
          if (!oldData) return oldData;
          
          return oldData.map((conv: any) => {
            if (conv.id === conversationId) {
              const lastMessage = data[data.length - 1];
              return {
                ...conv,
                lastMessage: lastMessage.content,
                lastMessageAt: lastMessage.createdAt,
              };
            }
            return conv;
          });
        });
      }
    }
  });
}

/**
 * Get knowledge base items with longer caching
 * Knowledge base changes less frequently so we use longer cache times
 */
export function useOptimizedKnowledgeBase() {
  const { user } = useAuth();
  
  return useCachedQuery({
    queryKey: ['/api/knowledge-base'],
    staleTime: LONG_CACHE_TIME, // Knowledge base rarely changes
    gcTime: LONG_CACHE_TIME,
    enabled: !!user,
    onSuccess: (data) => {
      console.log('[Optimized] Knowledge base loaded:', data.length);
    }
  });
}

/**
 * Get analytics with adaptive refresh intervals
 * Analytics can be cached longer since they're not time-critical
 */
export function useOptimizedAnalytics() {
  const { user } = useAuth();
  
  return useCachedQuery({
    queryKey: ['/api/analytics'],
    staleTime: MEDIUM_CACHE_TIME,
    gcTime: LONG_CACHE_TIME,
    enabled: !!user
  });
}

/**
 * Prefetch common data for faster navigation
 * Call this function when the app loads to warm up the cache
 */
export function prefetchCommonData() {
  const queryClient = useQueryClient();
  
  // Prefetch platforms (important for showing connection status)
  queryClient.prefetchQuery({
    queryKey: ['/api/platforms'],
    staleTime: MEDIUM_CACHE_TIME
  });
  
  // Prefetch conversations (common navigation target)
  queryClient.prefetchQuery({
    queryKey: ['/api/conversations'],
    staleTime: SHORT_CACHE_TIME
  });
}

// Global query client access
const queryClient = useQueryClient();