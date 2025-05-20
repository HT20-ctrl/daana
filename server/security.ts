import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import tinyCsrf from 'tiny-csrf';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

/**
 * Configure comprehensive security measures for the Express application
 */
export function setupSecurity(app: Express) {
  // 1. Enable secure HTTP headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for development tools
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://*'],
          connectSrc: ["'self'", 'https://*'],
        },
      },
      // Adjust for development if needed
      ...(process.env.NODE_ENV === 'development' ? {
        contentSecurityPolicy: false,
      } : {}),
    })
  );

  // 2. Configure strict CORS settings
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS || '').split(',')
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
  app.use(cors(corsOptions));

  // 3. Set up rate limiting to prevent brute force and DoS attacks
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  });

  // Apply rate limiting to authentication endpoints
  app.use('/api/login', apiLimiter);
  app.use('/api/callback', apiLimiter);
  
  // More restrictive rate limit for password reset (if implemented)
  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 password reset requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many password reset attempts, please try again after an hour'
  });
  app.use('/api/reset-password', passwordResetLimiter);

  // 4. Enable cookie parser for CSRF protection
  app.use(cookieParser(process.env.SESSION_SECRET));

  // 5. Set up CSRF protection with tiny-csrf
  const csrfProtection = tinyCsrf(
    process.env.SESSION_SECRET || 'csrf-secret-key'
  );

  // Apply CSRF protection to non-OAuth routes that change state
  // Exclude OAuth callback URLs and API endpoints that use token authentication
  app.use((req, res, next) => {
    // Skip CSRF for OAuth related endpoints and API endpoints
    if (
      req.path.startsWith('/api/callback') || 
      req.path.startsWith('/api/platforms') || 
      req.path === '/api/login' ||
      req.path === '/api/logout'
    ) {
      return next();
    }
    
    // Apply CSRF protection to other state-changing operations
    return csrfProtection(req, res, next);
  });

  // 6. Provide CSRF token for client
  app.get('/api/csrf-token', (req: Request, res: Response) => {
    // Explicitly cast the Request to have csrfToken method
    const csrfToken = (req as any).csrfToken();
    res.json({ csrfToken });
  });

  // 7. Add global error handler for security errors
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({
        message: 'Invalid CSRF token. Form submission failed for security reasons.'
      });
    }
    
    if (err.name === 'RateLimitExceeded') {
      return res.status(429).json({
        message: 'Rate limit exceeded. Please try again later.'
      });
    }
    
    next(err);
  });

  // 8. Add security headers for all responses
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

/**
 * Additional security middleware for sensitive operations
 * Can be applied to specific routes that require extra protection
 */
export function enhancedSecurityCheck(req: Request, res: Response, next: NextFunction) {
  // Check if the session is recent (within the last hour)
  // We'll use the user session's lastAccess time if available
  // or fallback to checking if there is a valid user session
  const user = req.user as any;
  const hourInMs = 60 * 60 * 1000;
  
  if (!user || !user.expires_at) {
    // No valid user session
    return res.status(401).json({
      message: 'Session expired for this operation. Please re-authenticate.',
      requiresReauth: true
    });
  }
  
  // For sensitive operations requiring fresh authentication
  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at - hourInMs/1000) {
    return res.status(401).json({
      message: 'Session refresh required for this sensitive operation. Please re-authenticate.',
      requiresReauth: true
    });
  }
  
  next();
}

/**
 * Middleware to enforce TLS connection
 */
export function requireHTTPS(req: Request, res: Response, next: NextFunction) {
  // Skip in development 
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Check for secure connection
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  
  next();
}