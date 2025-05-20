import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './errorHandling';

// Create a simpler monitoring system without external dependencies for now
// We'll keep the monitoring structure so we can easily add Sentry or another service later

// Initialize monitoring services
export function setupMonitoring(app: Express) {
  // Add a basic monitoring message
  logger.info('Application monitoring initialized');
  
  // When a SENTRY_DSN environment variable is provided, we can enable Sentry
  // For now, we'll log that it's not configured
  if (!process.env.SENTRY_DSN) {
    logger.info('Sentry DSN not provided. Using built-in error tracking only.');
  }

  // Add request logging middleware
  app.use(requestLogger);

  // Add performance monitoring middleware
  app.use(performanceMonitor);

  // Health check endpoint for infrastructure monitoring
  app.get('/api/health', healthCheck);
  
  // Detailed system status endpoint (protected)
  app.get('/api/health/detailed', systemStatus);
}

// Request logging middleware
function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Skip logging for static assets or health check endpoints
  if (req.path.includes('/assets/') || req.path === '/api/health') {
    return next();
  }

  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Add requestId to the request for tracking
  req.headers['x-request-id'] = requestId;
  
  // Log incoming request
  logger.info(`${req.method} ${req.path} started`, {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Capture response data
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - start;
    
    // Log response on completion
    logger.info(`${req.method} ${req.path} completed ${res.statusCode} in ${responseTime}ms`, {
      requestId,
      statusCode: res.statusCode,
      responseTime,
    });
    
    // Continue with the original send method
    return originalSend.call(this, body);
  };

  next();
}

// Performance monitoring middleware
function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  // Skip for static assets
  if (req.path.includes('/assets/')) {
    return next();
  }

  const start = Date.now();
  
  // Monitor response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`, {
        method: req.method,
        path: req.path,
        duration,
      });
    }
    
    // Collect metrics for potential future integrations
    // This is where metrics could be sent to a monitoring system like Datadog or Prometheus
  });

  next();
}

// Basic health check endpoint
function healthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

// Detailed system status (can be protected by auth middleware in production)
function systemStatus(req: Request, res: Response) {
  const memoryUsage = process.memoryUsage();
  
  const status = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    },
    cpu: process.cpuUsage(),
    pid: process.pid,
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env.NODE_ENV,
  };
  
  res.status(200).json(status);
}