import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import { generateAIResponse, extractTextFromFiles } from "./ai";
import { z } from "zod";
// import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import os from "os";

// Configure multer for file uploads
const upload = multer({
  dest: path.join(os.tmpdir(), "dana-ai-uploads"),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept only PDF, DOCX, and TXT files
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, and TXT files are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  await setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Simplified setup without WebSockets
  console.log("Setting up server routes - simplified version without WebSockets");
  
  // Helper function for client-side polling
  const clients = new Map();
  const pendingMessages = new Map();
  
  // Store messages for polling instead of pushing via WebSockets
  function storeMessageForPolling(userId: string, message: any) {
    if (!pendingMessages.has(userId)) {
      pendingMessages.set(userId, []);
    }
    pendingMessages.get(userId).push(message);
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Platforms API
  app.get("/api/platforms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const platforms = await storage.getPlatformsByUserId(userId);
      res.json(platforms);
    } catch (error) {
      console.error("Error fetching platforms:", error);
      res.status(500).json({ message: "Failed to fetch platforms" });
    }
  });

  app.post("/api/platforms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const platformData = { ...req.body, userId };
      const platform = await storage.createPlatform(platformData);
      res.status(201).json(platform);
    } catch (error) {
      console.error("Error creating platform:", error);
      res.status(500).json({ message: "Failed to create platform" });
    }
  });

  // Conversations API
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json({ conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationData = { ...req.body, userId };
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Messages API
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messageData = { ...req.body, conversationId };
      const message = await storage.createMessage(messageData);
      
      // Store message for polling instead of WebSocket
      storeMessageForPolling(userId, { type: "NEW_MESSAGE", payload: message });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // AI Response Generation
  app.post("/api/ai/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId, message } = req.body;
      
      if (!conversationId || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const conversation = await storage.getConversationById(parseInt(conversationId));
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Get conversation history
      const messages = await storage.getMessagesByConversationId(parseInt(conversationId));
      
      // Get knowledge base for context
      const knowledgeBase = await storage.getKnowledgeBaseByUserId(userId);
      
      // Generate AI response
      const aiResponse = await generateAIResponse(message, messages, knowledgeBase);
      
      // Save AI response
      const responseMessage = await storage.createMessage({
        conversationId: parseInt(conversationId),
        content: aiResponse,
        isFromCustomer: false,
        isAiGenerated: true
      });
      
      // Update analytics
      await storage.incrementAiResponses(userId);
      
      // Store response for polling instead of WebSocket
      storeMessageForPolling(userId, { type: "NEW_AI_RESPONSE", payload: responseMessage });
      
      res.json({ response: aiResponse, messageId: responseMessage.id });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // Knowledge Base API
  app.get("/api/knowledge-base", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const knowledgeBase = await storage.getKnowledgeBaseByUserId(userId);
      res.json(knowledgeBase);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  app.post("/api/knowledge-base", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Extract text from the file
      const content = await extractTextFromFiles(file.path, file.mimetype);
      
      // Get file type
      let fileType = "txt";
      if (file.mimetype === "application/pdf") {
        fileType = "pdf";
      } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        fileType = "docx";
      }
      
      const knowledgeBaseEntry = await storage.createKnowledgeBase({
        userId,
        fileName: file.originalname,
        fileType,
        fileSize: file.size,
        content
      });
      
      // Clean up temp file
      fs.unlinkSync(file.path);
      
      res.status(201).json(knowledgeBaseEntry);
    } catch (error) {
      console.error("Error uploading knowledge base file:", error);
      res.status(500).json({ message: "Failed to upload knowledge base file" });
    }
  });

  // Analytics API
  app.get("/api/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getAnalyticsByUserId(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.post("/api/analytics/increment-message", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.incrementTotalMessages(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error incrementing total messages:", error);
      res.status(500).json({ message: "Failed to increment total messages" });
    }
  });

  app.post("/api/analytics/increment-manual", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.incrementManualResponses(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error incrementing manual responses:", error);
      res.status(500).json({ message: "Failed to increment manual responses" });
    }
  });

  return httpServer;
}
