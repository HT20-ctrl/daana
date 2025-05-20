/**
 * Client-side performance monitoring utilities
 * These tools help track and optimize frontend performance
 */

// Store performance metrics
const clientPerfMetrics: Record<string, {
  count: number;
  totalTime: number;
  min: number;
  max: number;
  recent: number[];
}> = {};

/**
 * Measure the execution time of a function
 * @param name Identifier for the operation being measured
 * @param fn Function to measure
 * @returns The result of the function
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const elapsed = performance.now() - start;
    
    // Record the metric
    if (!clientPerfMetrics[name]) {
      clientPerfMetrics[name] = {
        count: 0,
        totalTime: 0,
        min: Number.MAX_VALUE,
        max: 0,
        recent: [],
      };
    }
    
    const metric = clientPerfMetrics[name];
    metric.count++;
    metric.totalTime += elapsed;
    metric.min = Math.min(metric.min, elapsed);
    metric.max = Math.max(metric.max, elapsed);
    
    // Keep the 10 most recent measurements
    metric.recent.push(elapsed);
    if (metric.recent.length > 10) {
      metric.recent.shift();
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ Client Perf [${name}]: ${elapsed.toFixed(2)}ms`);
    }
  }
}

/**
 * Measure the execution time of an async function
 * @param name Identifier for the operation being measured
 * @param fn Async function to measure
 * @returns Promise resolving to the result of the function
 */
export async function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const elapsed = performance.now() - start;
    
    // Record the metric
    if (!clientPerfMetrics[name]) {
      clientPerfMetrics[name] = {
        count: 0,
        totalTime: 0,
        min: Number.MAX_VALUE,
        max: 0,
        recent: [],
      };
    }
    
    const metric = clientPerfMetrics[name];
    metric.count++;
    metric.totalTime += elapsed;
    metric.min = Math.min(metric.min, elapsed);
    metric.max = Math.max(metric.max, elapsed);
    
    // Keep the 10 most recent measurements
    metric.recent.push(elapsed);
    if (metric.recent.length > 10) {
      metric.recent.shift();
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ Client Async Perf [${name}]: ${elapsed.toFixed(2)}ms`);
    }
  }
}

/**
 * Get all recorded performance metrics
 * @returns The full performance metrics data
 */
export function getClientPerformanceMetrics() {
  const result: Record<string, {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    recentAvg: number;
  }> = {};
  
  for (const [name, metric] of Object.entries(clientPerfMetrics)) {
    result[name] = {
      count: metric.count,
      avgTime: metric.totalTime / metric.count,
      minTime: metric.min,
      maxTime: metric.max,
      recentAvg: metric.recent.reduce((sum, val) => sum + val, 0) / metric.recent.length,
    };
  }
  
  return result;
}

/**
 * Reset all performance metrics
 */
export function resetClientPerformanceMetrics() {
  for (const key of Object.keys(clientPerfMetrics)) {
    delete clientPerfMetrics[key];
  }
}

/**
 * Record a web vitals metric
 * @param metric The web vitals metric to record
 */
export function recordWebVital(metric: {
  name: string;
  value: number;
  delta: number;
}) {
  // Log web vitals metrics in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Web Vital: ${metric.name} = ${metric.value}`);
  }
  
  // Send to server in production
  if (process.env.NODE_ENV === 'production') {
    // This would be implemented to send metrics to the backend
    // in a production environment
  }
}

/**
 * Track resource timing for critical resources
 */
export function trackResourceTiming() {
  if (window.performance && window.performance.getEntriesByType) {
    const resources = window.performance.getEntriesByType('resource');
    
    // Group resources by type
    const byType: Record<string, {
      count: number;
      totalDuration: number;
      items: PerformanceResourceTiming[];
    }> = {};
    
    for (const resource of resources) {
      const r = resource as PerformanceResourceTiming;
      
      // Extract resource type from the initiatorType or URL
      let type = r.initiatorType;
      
      if (!byType[type]) {
        byType[type] = {
          count: 0,
          totalDuration: 0,
          items: [],
        };
      }
      
      byType[type].count++;
      byType[type].totalDuration += r.duration;
      byType[type].items.push(r);
    }
    
    // Log slow resource types
    for (const [type, data] of Object.entries(byType)) {
      const avgDuration = data.totalDuration / data.count;
      
      if (avgDuration > 100) { // More than 100ms average is slow
        console.warn(`⚠️ Slow resource type [${type}]: ${avgDuration.toFixed(2)}ms avg (${data.count} resources)`);
        
        // Find the slowest resources of this type
        const slowItems = [...data.items]
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 3); // Top 3 slowest
        
        for (const item of slowItems) {
          console.warn(`  - ${item.name.split('?')[0]} (${item.duration.toFixed(2)}ms)`);
        }
      }
    }
  }
}

/**
 * Monitor component render times
 * Usage: wrapWithPerfMonitoring(MyComponent, "MyComponent")
 * 
 * @param Component The React component to monitor
 * @param componentName Name of the component for metrics
 * @returns Wrapped component with performance monitoring
 */
export function wrapWithPerfMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  return (props: P) => {
    const start = performance.now();
    const result = <Component {...props} />;
    const elapsed = performance.now() - start;
    
    // Record render time metric
    if (!clientPerfMetrics[`render:${componentName}`]) {
      clientPerfMetrics[`render:${componentName}`] = {
        count: 0,
        totalTime: 0,
        min: Number.MAX_VALUE,
        max: 0,
        recent: [],
      };
    }
    
    const metric = clientPerfMetrics[`render:${componentName}`];
    metric.count++;
    metric.totalTime += elapsed;
    metric.min = Math.min(metric.min, elapsed);
    metric.max = Math.max(metric.max, elapsed);
    metric.recent.push(elapsed);
    if (metric.recent.length > 10) {
      metric.recent.shift();
    }
    
    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && elapsed > 16) { // 16ms = 60fps
      console.warn(`🐢 Slow render: ${componentName} took ${elapsed.toFixed(2)}ms`);
    }
    
    return result;
  };
}