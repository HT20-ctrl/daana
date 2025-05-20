/**
 * Performance optimization utilities for the Dana AI Platform
 * This module provides tools to optimize application performance
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCacheTime } from './queryClient';

/**
 * Throttle a function call to limit its execution frequency
 * @param callback The function to throttle
 * @param delay The minimum time between function calls in milliseconds
 * @returns A throttled version of the function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastCall = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgs = useRef<any[]>([]);

  const throttledFn = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall.current;
    
    lastArgs.current = args;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (timeSinceLastCall >= delay) {
      lastCall.current = now;
      return callback(...args);
    } else {
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        timeoutRef.current = null;
        callback(...lastArgs.current);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);

  return throttledFn as T;
}

/**
 * Optimize resource loading with priority-based loading
 * @param resources Array of resource URLs to preload
 * @param priority 'high' | 'low' | 'auto' - priority of the resources
 */
export function useResourcePreload(
  resources: string[],
  priority: 'high' | 'low' | 'auto' = 'auto'
): void {
  useEffect(() => {
    // Skip in SSR
    if (typeof window === 'undefined') return;
    
    // Create link elements for preloading
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      
      // Determine resource type
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (/\.(png|jpe?g|gif|webp|avif)$/i.test(resource)) {
        link.as = 'image';
      } else if (/\.(woff2?|ttf|otf|eot)$/i.test(resource)) {
        link.as = 'font';
      }
      
      // Set fetch priority
      if (priority !== 'auto') {
        link.setAttribute('fetchpriority', priority);
      }
      
      link.href = resource;
      document.head.appendChild(link);
    });
    
    // Cleanup function
    return () => {
      resources.forEach(resource => {
        const links = document.querySelectorAll(`link[href="${resource}"]`);
        links.forEach(link => link.remove());
      });
    };
  }, [resources, priority]);
}

/**
 * Calculate optimized cache settings for different types of data
 * @param dataType Type of data being cached
 * @returns Optimal cache configuration for the data type
 */
export function getOptimalCacheConfig(dataType: string) {
  // Convert to query key format for reusing existing cache time logic
  const queryKey = `/${dataType}`;
  
  // Get optimal cache time from our existing cache time calculator
  const cacheTime = getCacheTime(queryKey);
  
  // Calculate optimized stale time based on data type
  let staleTime = 1000 * 30; // Default 30 seconds
  
  if (dataType.includes('messages') || dataType.includes('notifications')) {
    staleTime = 1000 * 15; // 15 seconds for dynamic data
  } else if (dataType.includes('conversations')) {
    staleTime = 1000 * 30; // 30 seconds
  } else if (dataType.includes('platforms') || dataType.includes('analytics')) {
    staleTime = 1000 * 60; // 1 minute for stable data
  } else if (dataType.includes('user') || dataType.includes('settings')) {
    staleTime = 1000 * 60 * 5; // 5 minutes for very stable data
  }
  
  return {
    cacheTime,
    staleTime,
    refetchOnWindowFocus: staleTime < 60000, // Only refetch on focus for fast-changing data
    refetchOnMount: staleTime < 300000, // Only refetch on mount for moderately stable data
  };
}

/**
 * Intersection Observer hook for lazy loading components and images
 * @param options IntersectionObserver options
 * @returns [ref, isVisible] - Ref to attach to the element, and whether it's visible
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: '100px' }
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const element = ref.current;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      });
    }, options);
    
    observer.observe(element);
    
    return () => {
      if (element) observer.unobserve(element);
    };
  }, [options]);
  
  return [ref, isVisible];
}

/**
 * Measure and log performance metrics for debugging
 * @param metricName Name of the metric to measure
 * @returns Functions to start and stop measuring the metric
 */
export function usePerformanceMetric(metricName: string) {
  const startTimeRef = useRef<number>(0);
  
  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  const stop = useCallback(() => {
    if (startTimeRef.current === 0) return 0;
    
    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ Performance Metric - ${metricName}: ${duration.toFixed(2)}ms`);
    }
    
    startTimeRef.current = 0;
    return duration;
  }, [metricName]);
  
  return { start, stop };
}