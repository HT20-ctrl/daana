import type { Express } from "express";
import { createServer, type Server } from "http";
import { isAuthenticated } from "./replitAuth";
import {
  connectFacebookHandler,
  connectInstagramHandler,
  connectSlackHandler,
  connectEmailHandler,
  connectHubSpotHandler,
  connectSalesforceHandler,
  connectWhatsAppHandler,
  disconnectFacebookHandler,
  disconnectInstagramHandler,
  disconnectSlackHandler,
  disconnectEmailHandler,
  disconnectHubSpotHandler,
  disconnectSalesforceHandler,
  disconnectWhatsAppHandler
} from "./platforms/platformHandlers";

export function registerPlatformRoutes(app: Express) {
  // Facebook routes
  app.get("/api/platforms/facebook/connect", isAuthenticated, connectFacebookHandler);
  app.post("/api/platforms/facebook/disconnect", isAuthenticated, disconnectFacebookHandler);

  // Instagram routes
  app.get("/api/platforms/instagram/connect", isAuthenticated, connectInstagramHandler);
  app.post("/api/platforms/instagram/disconnect", isAuthenticated, disconnectInstagramHandler);

  // Slack routes
  app.get("/api/platforms/slack/connect", isAuthenticated, connectSlackHandler);
  app.post("/api/platforms/slack/disconnect", isAuthenticated, disconnectSlackHandler);

  // Email/Gmail routes
  app.get("/api/platforms/email/connect", isAuthenticated, connectEmailHandler);
  app.post("/api/platforms/email/disconnect", isAuthenticated, disconnectEmailHandler);

  // HubSpot routes
  app.get("/api/platforms/hubspot/connect", isAuthenticated, connectHubSpotHandler);
  app.post("/api/platforms/hubspot/disconnect", isAuthenticated, disconnectHubSpotHandler);

  // Salesforce routes
  app.get("/api/platforms/salesforce/connect", isAuthenticated, connectSalesforceHandler);
  app.post("/api/platforms/salesforce/disconnect", isAuthenticated, disconnectSalesforceHandler);

  // WhatsApp routes
  app.get("/api/platforms/whatsapp/connect", isAuthenticated, connectWhatsAppHandler);
  app.post("/api/platforms/whatsapp/disconnect", isAuthenticated, disconnectWhatsAppHandler);
}