import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./simplified-routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorHandler, logger } from "./errorHandling";
import { setupMonitoring } from "./monitoring";
import { performanceMiddleware } from "./monitoring/performance";
import { multiTenantMiddleware } from "./middleware/multiTenant";

const app = express();

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Add performance monitoring middleware
app.use(performanceMiddleware);

// Set up organization context middleware for multi-tenant security
app.use(multiTenantMiddleware);

// Set up essential security features
// 1. Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.replit\.app$/, /\.repl\.co$/] 
    : true,
  credentials: true,
}));

// 2. Add cookie parser for sessions
app.use(cookieParser(process.env.SESSION_SECRET));

// 3. Configure basic Helmet (with development-friendly settings)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Set up monitoring and health checks
  setupMonitoring(app);
  
  // Use our comprehensive error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();