import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  connectFacebook, 
  facebookCallback, 
  getFacebookMessages,
  sendFacebookMessage,
  isFacebookConfigured,
  getFacebookStatus
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

import {
  connectSlack,
  getSlackMessages,
  sendSlackMessage,
  isSlackConfigured,
  getSlackStatus
} from "./platforms/slack";

import {
  connectEmail,
  getEmailMessages,
  sendEmailMessage,
  isEmailConfigured,
  getEmailStatus
} from "./platforms/email";

import {
  connectHubSpot,
  hubspotCallback,
  getHubSpotContacts,
  createHubSpotContact,
  isHubSpotConfigured,
  getHubSpotStatus
} from "./platforms/hubspot";

import {
  connectSalesforce,
  salesforceCallback,
  getSalesforceLeads,
  createSalesforceLead,
  getSalesforceOpportunities,
  isSalesforceConfigured,
  getSalesforceStatus
} from "./platforms/salesforce";

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
      let platforms = await storage.getPlatformsByUserId(userId);
      
      // If no platforms are found, create default platform entries for demonstration purposes
      if (!platforms || platforms.length === 0) {
        // Create default platform entries - these will allow users to connect to various platforms
        const defaultPlatforms = [
          {
            name: "facebook",
            displayName: "Facebook",
            userId: userId,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
            isConnected: false
          },
          {
            name: "instagram",
            displayName: "Instagram",
            userId: userId,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
            isConnected: false
          },
          {
            name: "whatsapp",
            displayName: "WhatsApp",
            userId: userId,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
            isConnected: false
          },
          {
            name: "slack",
            displayName: "Slack",
            userId: userId,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
            isConnected: false
          },
          {
            name: "email",
            displayName: "Email",
            userId: userId,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
            isConnected: false
          }
        ];
        
        // Create each platform
        for (const platform of defaultPlatforms) {
          await storage.createPlatform(platform);
        }
        
        // Get the newly created platforms
        platforms = await storage.getPlatformsByUserId(userId);
      }
      
      res.json(platforms);
    } catch (error) {
      console.error("Error fetching platforms:", error);
      res.status(500).json({ message: "Failed to fetch platforms" });
    }
  });
  
  // Disconnect platform endpoint
  app.delete("/api/platforms/:platformId", async (req, res) => {
    try {
      const platformId = parseInt(req.params.platformId);
      console.log(`Attempting to disconnect platform with ID: ${platformId}`);
      
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        console.log(`Platform with ID ${platformId} not found`);
        return res.status(404).json({ error: "Platform not found" });
      }
      
      console.log(`Disconnecting platform: ${platform.name} (ID: ${platformId})`);
      
      // In a real app, this would revoke the access token with the platform's API
      
      // Completely remove the platform instead of creating a disconnected version
      await storage.deletePlatform(platformId);
      
      // Also delete any other platforms with the same name to ensure clean state
      const userPlatforms = await storage.getPlatformsByUserId(platform.userId);
      
      for (const p of userPlatforms) {
        if (p.name === platform.name && p.id !== platformId) {
          console.log(`Also removing related platform ID: ${p.id}`);
          await storage.deletePlatform(p.id);
        }
      }
      
      console.log(`Platform ${platform.name} successfully disconnected`);
      
      res.status(200).json({ 
        message: "Platform disconnected successfully"
      });
    } catch (error) {
      console.error("Error disconnecting platform:", error);
      res.status(500).json({ error: "Failed to disconnect platform" });
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
  app.get("/api/platforms/facebook/status", getFacebookStatus);

  app.get("/api/platforms/facebook/connect", async (req, res) => {
    try {
      // Setup session for the OAuth flow if it doesn't exist
      if (!req.session) {
        req.session = {};
      }

      console.log("Facebook connect endpoint called");
      
      // If Facebook is configured with real credentials, use the OAuth flow
      if (isFacebookConfigured()) {
        console.log("Using real Facebook OAuth flow");
        return connectFacebook(req, res);
      }
      
      console.log("Using demo Facebook connection");
      
      // Remove all Facebook platforms for the user
      const userId = "1"; // Demo user ID
      const existingPlatforms = await storage.getPlatformsByUserId(userId);
      
      // Find and completely disconnect all existing Facebook platforms
      console.log("Setting all existing Facebook platforms to disconnected");
      for (const platform of existingPlatforms) {
        if (platform.name === "facebook") {
          try {
            console.log(`Updating Facebook platform ID: ${platform.id} to disconnected`);
            // Since we don't have a proper delete, mark as disconnected
            await storage.createPlatform({
              ...platform,
              isConnected: false,
              accessToken: null,
              refreshToken: null,
              tokenExpiry: null
            });
          } catch (error) {
            console.error(`Failed to update platform ${platform.id}:`, error);
          }
        }
      }
      
      // Create a single fresh Facebook connection for this specific account
      console.log("Creating new Facebook connection for individual account");
      await storage.createPlatform({
        userId,
        name: "facebook",
        displayName: "Facebook - Main Business Page",
        accessToken: "mock-access-token",
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isConnected: true
      });
      
      // Redirect back to the settings page with a success parameter
      return res.redirect('/settings?fb_connected=true');
    } catch (error) {
      console.error("Error connecting to Facebook:", error);
      return res.redirect('/settings?fb_error=true&error_reason=connection_failed');
    }
  });

  app.get("/api/platforms/facebook/callback", async (req, res) => {
    // Setup session if it doesn't exist
    if (!req.session) {
      req.session = {};
    }
    
    try {
      if (isFacebookConfigured()) {
        // With real credentials, process the OAuth callback
        return facebookCallback(req, res);
      } else {
        // For demo purposes, create a simulated successful connection
        res.redirect('/settings?fb_connected=true&mock=true');
      }
    } catch (error) {
      console.error("Error handling Facebook callback:", error);
      res.redirect('/settings?fb_error=true&error_reason=callback_error');
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

  // Slack Platform Integration
  app.get("/api/platforms/slack/status", async (req, res) => {
    res.json({
      configured: isSlackConfigured(),
      needsCredentials: !isSlackConfigured()
    });
  });

  app.get("/api/platforms/slack/connect", async (req, res) => {
    // For development purposes, create a mock platform since we don't have real credentials
    if (!isSlackConfigured()) {
      try {
        const userId = "1"; // Demo user ID
        const platform = await storage.createPlatform({
          userId,
          name: "slack",
          displayName: "Slack Workspace (Demo User)",
          accessToken: "mock-access-token",
          refreshToken: null,
          tokenExpiry: null, // Bot tokens don't expire
          isConnected: true
        });
        return res.redirect('/settings?slack_connected=true');
      } catch (error) {
        console.error("Error creating mock Slack connection:", error);
        return res.status(500).json({ error: "Failed to create mock connection" });
      }
    } else {
      connectSlack(req, res);
    }
  });

  app.get("/api/platforms/:platformId/slack/messages", async (req, res) => {
    try {
      const platformId = parseInt(req.params.platformId);
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }
      
      if (isSlackConfigured()) {
        // Use real Slack API to get messages
        return getSlackMessages(req, res);
      }
      
      // Return mock Slack messages for demonstration
      const mockMessages = [
        {
          id: "slack-msg-1",
          senderId: "U012A345B",
          senderName: "Ryan Johnson",
          content: "Team meeting at 3pm today to discuss the new feature rollout",
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          isRead: true
        },
        {
          id: "slack-msg-2",
          senderId: "U678C901D",
          senderName: "Sophia Kim",
          content: "The latest build is now available for testing. Please review by EOD.",
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          isRead: true
        },
        {
          id: "slack-msg-3",
          senderId: "U234E567F",
          senderName: "Marcus Chen",
          content: "Customer reported an issue with checkout flow. Can someone investigate?",
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          isRead: false
        }
      ];
      
      res.json(mockMessages);
    } catch (error) {
      console.error("Error fetching Slack messages:", error);
      res.status(500).json({ error: "Failed to fetch Slack messages" });
    }
  });

  app.post("/api/platforms/:platformId/slack/messages", async (req, res) => {
    try {
      const { message } = req.body;
      const platformId = parseInt(req.params.platformId);
      
      if (!message) {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }
      
      if (isSlackConfigured()) {
        // Use real Slack API to send message
        req.body = { message }; // Format for the actual handler
        return sendSlackMessage(req, res);
      }
      
      // Mock sending a message
      res.json({ 
        success: true, 
        message: "Message sent successfully", 
        messageId: `mock-${Date.now()}`
      });
    } catch (error) {
      console.error("Error sending Slack message:", error);
      res.status(500).json({ error: "Failed to send Slack message" });
    }
  });

  // Email Platform Integration
  app.get("/api/platforms/email/status", async (req, res) => {
    res.json({
      configured: isEmailConfigured(),
      needsCredentials: !isEmailConfigured()
    });
  });

  app.get("/api/platforms/email/connect", async (req, res) => {
    // For development purposes, create a mock platform since we don't have real credentials
    if (!isEmailConfigured()) {
      try {
        const userId = "1"; // Demo user ID
        const platform = await storage.createPlatform({
          userId,
          name: "email",
          displayName: "Email Integration (Demo)",
          accessToken: "mock-sendgrid-key",
          refreshToken: null,
          tokenExpiry: null, // API keys don't expire
          isConnected: true
        });
        return res.redirect('/settings?email_connected=true');
      } catch (error) {
        console.error("Error creating mock Email connection:", error);
        return res.status(500).json({ error: "Failed to create mock connection" });
      }
    } else {
      connectEmail(req, res);
    }
  });

  app.get("/api/platforms/:platformId/email/messages", async (req, res) => {
    try {
      const platformId = parseInt(req.params.platformId);
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }
      
      if (isEmailConfigured()) {
        // Use real Email API to get messages
        return getEmailMessages(req, res);
      }
      
      // Return mock Email messages for demonstration
      const mockMessages = [
        {
          id: "email-msg-1",
          senderId: "customer@example.com",
          senderName: "John Customer",
          content: "I have a question about my recent order #12345",
          subject: "Order Inquiry",
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          isRead: true
        },
        {
          id: "email-msg-2",
          senderId: "support@competitor.com",
          senderName: "Jane Potential",
          content: "I'm interested in your enterprise plan. Can you send me more information?",
          subject: "Enterprise Plan Information",
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          isRead: false
        },
        {
          id: "email-msg-3",
          senderId: "billing@partner.com",
          senderName: "Finance Team",
          content: "Your invoice #INV-567 is now available",
          subject: "Invoice Available",
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          isRead: false
        }
      ];
      
      res.json(mockMessages);
    } catch (error) {
      console.error("Error fetching Email messages:", error);
      res.status(500).json({ error: "Failed to fetch Email messages" });
    }
  });

  app.post("/api/platforms/:platformId/email/messages", async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      const platformId = parseInt(req.params.platformId);
      
      if (!to || !subject || !message) {
        return res.status(400).json({ error: "Email recipient, subject, and message content are required" });
      }
      
      const platform = await storage.getPlatformById(platformId);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }
      
      if (isEmailConfigured()) {
        // Use real Email API to send message
        return sendEmailMessage(req, res);
      }
      
      // Mock sending an email
      console.log(`[MOCK] Email would be sent to ${to} with subject: ${subject}`);
      res.json({ 
        success: true, 
        message: "Email would be sent (mock mode)",
        mock: true,
        messageId: `mock-email-${Date.now()}`
      });
    } catch (error) {
      console.error("Error sending Email:", error);
      res.status(500).json({ error: "Failed to send Email" });
    }
  });

  // HubSpot platform routes
  app.get("/api/platforms/hubspot/status", getHubSpotStatus);
  app.post("/api/platforms/hubspot/connect", connectHubSpot);
  app.get("/api/platforms/hubspot/callback", hubspotCallback);
  app.get("/api/platforms/hubspot/contacts", getHubSpotContacts);
  app.post("/api/platforms/hubspot/contacts", createHubSpotContact);
  
  // Salesforce platform routes
  app.get("/api/platforms/salesforce/status", getSalesforceStatus);
  app.post("/api/platforms/salesforce/connect", connectSalesforce);
  app.get("/api/platforms/salesforce/callback", salesforceCallback);
  app.get("/api/platforms/salesforce/leads", getSalesforceLeads);
  app.post("/api/platforms/salesforce/leads", createSalesforceLead);
  app.get("/api/platforms/salesforce/opportunities", getSalesforceOpportunities);

  return httpServer;
}