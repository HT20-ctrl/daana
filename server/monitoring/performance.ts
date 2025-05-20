/**
 * Performance monitoring utilities for server-side operations
 * These tools help track and optimize application performance
 */
import { NextFunction, Request, Response } from 'express';

// Store performance metrics
const perfMetrics: Record<string, {
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
 * @returns The result of the measured function
 */
export async function measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = process.hrtime();
  try {
    return await fn();
  } finally {
    const [seconds, nanoseconds] = process.hrtime(start);
    const elapsed = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    
    // Record the metric
    if (!perfMetrics[name]) {
      perfMetrics[name] = {
        count: 0,
        totalTime: 0,
        min: Number.MAX_VALUE,
        max: 0,
        recent: [],
      };
    }
    
    const metric = perfMetrics[name];
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
      console.log(`⚡ Performance [${name}]: ${elapsed.toFixed(2)}ms`);
    }
  }
}

/**
 * Express middleware to measure API endpoint performance
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  const url = req.originalUrl || req.url;
  
  // Record response time once the response is finished
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const elapsed = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    
    const metricName = `API:${req.method}:${url}`;
    
    // Record the metric
    if (!perfMetrics[metricName]) {
      perfMetrics[metricName] = {
        count: 0,
        totalTime: 0,
        min: Number.MAX_VALUE,
        max: 0,
        recent: [],
      };
    }
    
    const metric = perfMetrics[metricName];
    metric.count++;
    metric.totalTime += elapsed;
    metric.min = Math.min(metric.min, elapsed);
    metric.max = Math.max(metric.max, elapsed);
    
    // Keep the 10 most recent measurements
    metric.recent.push(elapsed);
    if (metric.recent.length > 10) {
      metric.recent.shift();
    }
    
    // Log slow API calls that exceed thresholds
    if (elapsed > 1000) { // Over 1 second is concerning
      console.warn(`⚠️ Slow API [${metricName}]: ${elapsed.toFixed(2)}ms`);
    } else if (process.env.NODE_ENV === 'development' && elapsed > 200) { // Over 200ms in dev is worth noting
      console.log(`⏱️ API Perf [${metricName}]: ${elapsed.toFixed(2)}ms`);
    }
  });
  
  next();
}

/**
 * Get all recorded performance metrics
 * @returns The full performance metrics data
 */
export function getPerformanceMetrics() {
  const result: Record<string, {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    recentAvg: number;
  }> = {};
  
  for (const [name, metric] of Object.entries(perfMetrics)) {
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
export function resetPerformanceMetrics() {
  for (const key of Object.keys(perfMetrics)) {
    delete perfMetrics[key];
  }
}

/**
 * Identify potential performance bottlenecks
 * @returns List of operations that may require optimization
 */
export function identifyBottlenecks() {
  const bottlenecks = [];
  
  for (const [name, metric] of Object.entries(perfMetrics)) {
    const avgTime = metric.totalTime / metric.count;
    const recentAvg = metric.recent.reduce((sum, val) => sum + val, 0) / metric.recent.length;
    
    // Check for slow operations
    if (avgTime > 500 || recentAvg > 500) { // Over 500ms is slow
      bottlenecks.push({
        name,
        avgTime,
        recentAvg,
        callCount: metric.count,
        maxTime: metric.max,
      });
    }
  }
  
  // Sort by average time (slowest first)
  return bottlenecks.sort((a, b) => b.avgTime - a.avgTime);
}