/**
 * Optimized API request functions with enhanced caching and performance
 * This module provides optimized versions of common API requests
 */
import { useCallback } from 'react';
import { useCachedQuery, usePrefetchedQuery } from '@/hooks/useCachedQuery';
import { apiRequest } from './queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { usePerformanceMetric } from './performance';
import type { Platform, Conversation, Message, KnowledgeBase, Analytics } from '@shared/schema';

// ===== PLATFORMS =====

/**
 * Get all platforms with optimized caching
 * - Uses prefetching for faster initial load
 * - Data is refreshed intelligently in the background
 */
export function usePlatforms() {
  const metrics = usePerformanceMetric('fetch-platforms');
  
  const result = usePrefetchedQuery<Platform[]>('/api/platforms', {
    onSuccess: () => metrics.stop(),
    onError: () => metrics.stop(),
  });
  
  metrics.start();
  return result;
}

/**
 * Connection mutation for platforms with cache invalidation
 */
export function useConnectPlatform() {
  const queryClient = useQueryClient();
  
  const connectPlatform = useCallback(async (platformId: number, connectionData: any) => {
    const metrics = usePerformanceMetric('connect-platform');
    metrics.start();
    
    const response = await apiRequest(`/api/platforms/${platformId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(connectionData),
    });
    
    // Invalidate related caches to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
    queryClient.invalidateQueries({ queryKey: [`/api/platforms/${platformId}`] });
    
    metrics.stop();
    return response;
  }, [queryClient]);
  
  return { connectPlatform };
}

// ===== CONVERSATIONS =====

/**
 * Get conversations with optimized caching
 * - Frequently updated data with short cache times
 * - Background refresh for latest conversations
 */
export function useConversations() {
  const metrics = usePerformanceMetric('fetch-conversations');
  
  const result = useCachedQuery<Conversation[]>('/api/conversations', {
    refreshInterval: 30000, // Refresh every 30 seconds
    onSuccess: () => metrics.stop(),
    onError: () => metrics.stop(),
  });
  
  metrics.start();
  return result;
}

/**
 * Get a specific conversation with its messages
 * - Optimized for frequently changing data
 * - Uses short stale times for fresh data
 */
export function useConversation(id: number) {
  const queryClient = useQueryClient();
  const metrics = usePerformanceMetric(`fetch-conversation-${id}`);
  
  const result = useCachedQuery<Conversation>(`/api/conversations/${id}`, {
    enabled: !!id,
    onSuccess: () => {
      metrics.stop();
      // Prefetch messages for this conversation
      queryClient.prefetchQuery({
        queryKey: [`/api/conversations/${id}/messages`],
        staleTime: 1000 * 15, // Short stale time for messages
      });
    },
    onError: () => metrics.stop(),
  });
  
  metrics.start();
  return result;
}

/**
 * Get messages for a conversation with optimized refresh
 */
export function useMessages(conversationId: number) {
  const metrics = usePerformanceMetric(`fetch-messages-${conversationId}`);
  
  const result = useCachedQuery<Message[]>(`/api/conversations/${conversationId}/messages`, {
    enabled: !!conversationId,
    refreshInterval: 10000, // Refresh every 10 seconds
    onSuccess: () => metrics.stop(),
    onError: () => metrics.stop(),
  });
  
  metrics.start();
  return result;
}

// ===== KNOWLEDGE BASE =====

/**
 * Get knowledge base items with longer cache times
 * - Less frequently changing data
 * - Optimized for read performance
 */
export function useKnowledgeBase() {
  const metrics = usePerformanceMetric('fetch-knowledge-base');
  
  const result = useCachedQuery<KnowledgeBase[]>('/api/knowledge-base', {
    onSuccess: () => metrics.stop(),
    onError: () => metrics.stop(),
  });
  
  metrics.start();
  return result;
}

// ===== ANALYTICS =====

/**
 * Get analytics data with optimized caching
 * - Moderately changing data
 * - Periodically refreshed for dashboard
 */
export function useAnalytics() {
  const metrics = usePerformanceMetric('fetch-analytics');
  
  const result = useCachedQuery<Analytics>('/api/analytics', {
    refreshInterval: 60000, // Refresh every minute
    onSuccess: () => metrics.stop(),
    onError: () => metrics.stop(),
  });
  
  metrics.start();
  return result;
}

// ===== NOTIFICATIONS =====

/**
 * Get notifications with very short cache times
 * - Highly dynamic data that changes frequently
 * - Very short stale time to ensure freshness
 */
export function useNotifications() {
  const result = useCachedQuery('/api/notifications', {
    refreshInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000, // Very short stale time - 5 seconds
  });
  
  return result;
}