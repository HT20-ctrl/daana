/**
 * Performance monitoring routes
 * These provide access to performance metrics and optimizations
 */
import { Router } from 'express';
import { 
  getPerformanceMetrics, 
  identifyBottlenecks, 
  resetPerformanceMetrics 
} from '../monitoring/performance';
import { isAuthenticated } from '../replitAuth';

const router = Router();

/**
 * Get all performance metrics
 * Admin-only endpoint for monitoring application performance
 */
router.get('/metrics', isAuthenticated, (req, res) => {
  // Only admin users should access performance metrics
  if ((req.user as any)?.claims?.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Only administrators can access performance metrics' 
    });
  }
  
  const metrics = getPerformanceMetrics();
  
  res.json({
    metrics,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

/**
 * Get system bottlenecks
 * Identifies operations that may need optimization
 */
router.get('/bottlenecks', isAuthenticated, (req, res) => {
  // Only admin users should access performance metrics
  if ((req.user as any)?.claims?.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Only administrators can access performance metrics' 
    });
  }
  
  const bottlenecks = identifyBottlenecks();
  
  res.json({
    bottlenecks,
    timestamp: new Date().toISOString(),
    suggestedActions: bottlenecks.length > 0 
      ? 'Review the slowest operations and consider adding indexes or optimizing queries'
      : 'No performance bottlenecks detected'
  });
});

/**
 * Reset performance metrics
 * Useful after implementing optimizations to get fresh metrics
 */
router.post('/reset', isAuthenticated, (req, res) => {
  // Only admin users should be able to reset performance metrics
  if ((req.user as any)?.claims?.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Only administrators can reset performance metrics' 
    });
  }
  
  resetPerformanceMetrics();
  
  res.json({
    success: true,
    message: 'Performance metrics reset successfully',
    timestamp: new Date().toISOString()
  });
});

export default router;