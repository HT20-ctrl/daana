import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  connectFacebook, 
  facebookCallback, 
  getFacebookMessages,
  sendFacebookMessage,
  isFacebookConfigured
} from "./platforms/facebook";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("Setting up simplified routes - no auth required");

  // Create HTTP server
  const httpServer = createServer(app);

  // Simple auth route that returns a demo user
  app.get('/api/auth/user', async (req, res) => {
    try {
      // For development, return a demo user
      const demoUser = {
        id: "1",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        profileImageUrl: null,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      res.json(demoUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Platforms API
  app.get("/api/platforms", async (req, res) => {
    try {
      const userId = "1"; // Demo user ID
      const platforms = await storage.getPlatformsByUserId(userId);
      res.json(platforms);
    } catch (error) {
      console.error("Error fetching platforms:", error);
      res.status(500).json({ message: "Failed to fetch platforms" });
    }
  });

  // Conversations API
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = "1"; // Demo user ID
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Knowledge Base API
  app.get("/api/knowledge-base", async (req, res) => {
    try {
      const userId = "1"; // Demo user ID
      const knowledgeBase = await storage.getKnowledgeBaseByUserId(userId);
      res.json(knowledgeBase);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  // Analytics API
  app.get("/api/analytics", async (req, res) => {
    try {
      const userId = "1"; // Demo user ID
      const analytics = await storage.getAnalyticsByUserId(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Facebook Platform Integration
  app.get("/api/platforms/facebook/status", async (req, res) => {
    res.json({
      configured: isFacebookConfigured(),
      needsCredentials: !isFacebookConfigured()
    });
  });

  app.get("/api/platforms/facebook/connect", async (req, res) => {
    // For development purposes, create a mock platform since we don't have real credentials
    if (!isFacebookConfigured()) {
      try {
        const userId = "1"; // Demo user ID
        const platform = await storage.createPlatform({
          userId,
          name: "facebook",
          displayName: "Facebook (Demo User)",
          accessToken: "mock-access-token",
          refreshToken: null,
          tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isConnected: true
        });
        return res.redirect('/settings?fb_connected=true');
      } catch (error) {
        console.error("Error creating mock Facebook connection:", error);
        return res.status(500).json({ error: "Failed to create mock connection" });
      }
    } else {
      connectFacebook(req, res);
    }
  });

  app.get("/api/platforms/facebook/callback", async (req, res) => {
    if (!isFacebookConfigured()) {
      res.redirect('/settings?fb_connected=true&mock=true');
    } else {
      facebookCallback(req, res);
    }
  });

  app.get("/api/platforms/:platformId/facebook/messages", async (req, res) => {
    try {
      const platformId = parseInt(req.params.platformId);
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }
      
      // Return mock Facebook messages for demonstration
      const mockMessages = [
        {
          id: "fb-msg-1",
          senderId: "fb-user-123",
          senderName: "John Smith",
          content: "Hi there! I'm interested in your product.",
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          isRead: true
        },
        {
          id: "fb-msg-2",
          senderId: "fb-user-456",
          senderName: "Sarah Johnson",
          content: "Do you offer international shipping?",
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          isRead: false
        },
        {
          id: "fb-msg-3",
          senderId: "fb-user-789",
          senderName: "Michael Brown",
          content: "What are your business hours?",
          timestamp: new Date(Date.now() - 900000), // 15 minutes ago
          isRead: false
        }
      ];
      
      res.json(mockMessages);
    } catch (error) {
      console.error("Error fetching Facebook messages:", error);
      res.status(500).json({ error: "Failed to fetch Facebook messages" });
    }
  });

  return httpServer;
}