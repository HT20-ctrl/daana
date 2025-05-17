import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  return httpServer;
}