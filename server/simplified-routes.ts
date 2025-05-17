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

import {
  connectInstagram,
  instagramCallback,
  getInstagramMessages,
  sendInstagramMessage,
  isInstagramConfigured,
  getInstagramStatus
} from "./platforms/instagram";

import {
  connectWhatsApp,
  whatsappCallback,
  getWhatsAppMessages,
  sendWhatsAppMessage,
  isWhatsAppConfigured,
  getWhatsAppStatus
} from "./platforms/whatsapp";

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

  // Instagram Platform Integration
  app.get("/api/platforms/instagram/status", async (req, res) => {
    res.json({
      configured: isInstagramConfigured(),
      needsCredentials: !isInstagramConfigured()
    });
  });

  app.get("/api/platforms/instagram/connect", async (req, res) => {
    // For development purposes, create a mock platform since we don't have real credentials
    if (!isInstagramConfigured()) {
      try {
        const userId = "1"; // Demo user ID
        const platform = await storage.createPlatform({
          userId,
          name: "instagram",
          displayName: "Instagram (Demo User)",
          accessToken: "mock-access-token",
          refreshToken: null,
          tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isConnected: true
        });
        return res.redirect('/settings?ig_connected=true');
      } catch (error) {
        console.error("Error creating mock Instagram connection:", error);
        return res.status(500).json({ error: "Failed to create mock connection" });
      }
    } else {
      connectInstagram(req, res);
    }
  });

  app.get("/api/platforms/instagram/callback", async (req, res) => {
    if (!isInstagramConfigured()) {
      res.redirect('/settings?ig_connected=true&mock=true');
    } else {
      instagramCallback(req, res);
    }
  });

  app.get("/api/platforms/:platformId/instagram/messages", async (req, res) => {
    try {
      const platformId = parseInt(req.params.platformId);
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }
      
      // Return mock Instagram messages for demonstration
      const mockMessages = [
        {
          id: "ig-msg-1",
          senderId: "ig-user-123",
          senderName: "Alex Chen",
          content: "Do you ship to Canada?",
          timestamp: new Date(Date.now() - 4800000), // 80 minutes ago
          isRead: true
        },
        {
          id: "ig-msg-2",
          senderId: "ig-user-456",
          senderName: "Isabella Rodriguez",
          content: "Love your products! Can I get more information?",
          timestamp: new Date(Date.now() - 2400000), // 40 minutes ago
          isRead: false
        },
        {
          id: "ig-msg-3",
          senderId: "ig-user-789",
          senderName: "Jordan Taylor",
          content: "What's the price for this item?",
          timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
          isRead: false
        }
      ];
      
      res.json(mockMessages);
    } catch (error) {
      console.error("Error fetching Instagram messages:", error);
      res.status(500).json({ error: "Failed to fetch Instagram messages" });
    }
  });

  // WhatsApp Platform Integration
  app.get("/api/platforms/whatsapp/status", async (req, res) => {
    res.json({
      configured: isWhatsAppConfigured(),
      needsCredentials: !isWhatsAppConfigured()
    });
  });

  app.get("/api/platforms/whatsapp/connect", async (req, res) => {
    // For development purposes, create a mock platform since we don't have real credentials
    if (!isWhatsAppConfigured()) {
      try {
        const userId = "1"; // Demo user ID
        const platform = await storage.createPlatform({
          userId,
          name: "whatsapp",
          displayName: "WhatsApp Business (Demo User)",
          accessToken: "mock-access-token",
          refreshToken: null,
          tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isConnected: true
        });
        return res.redirect('/settings?wa_connected=true');
      } catch (error) {
        console.error("Error creating mock WhatsApp connection:", error);
        return res.status(500).json({ error: "Failed to create mock connection" });
      }
    } else {
      connectWhatsApp(req, res);
    }
  });

  app.get("/api/platforms/whatsapp/callback", async (req, res) => {
    if (!isWhatsAppConfigured()) {
      res.redirect('/settings?wa_connected=true&mock=true');
    } else {
      whatsappCallback(req, res);
    }
  });

  app.get("/api/platforms/:platformId/whatsapp/messages", async (req, res) => {
    try {
      const platformId = parseInt(req.params.platformId);
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }
      
      // Return mock WhatsApp messages for demonstration
      const mockMessages = [
        {
          id: "wa-msg-1",
          senderId: "+1415555123",
          senderName: "Maria Garcia",
          content: "Hello, I'd like to place an order for delivery",
          timestamp: new Date(Date.now() - 5400000), // 90 minutes ago
          isRead: true
        },
        {
          id: "wa-msg-2",
          senderId: "+4478901234",
          senderName: "Thomas Wright",
          content: "What are your operating hours today?",
          timestamp: new Date(Date.now() - 3000000), // 50 minutes ago
          isRead: false
        },
        {
          id: "wa-msg-3",
          senderId: "+6598765432",
          senderName: "Lina Wong",
          content: "Is the blue shirt still available in size M?",
          timestamp: new Date(Date.now() - 1500000), // 25 minutes ago
          isRead: false
        }
      ];
      
      res.json(mockMessages);
    } catch (error) {
      console.error("Error fetching WhatsApp messages:", error);
      res.status(500).json({ error: "Failed to fetch WhatsApp messages" });
    }
  });

  return httpServer;
}