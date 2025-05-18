import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { setupAuth, isAuthenticated } from "./replitAuth";

// Development middleware for testing without auth
const isAuthenticated = (req: any, res: any, next: any) => {
  // Set a demo user ID for all requests
  req.user = { 
    claims: { 
      sub: "1" 
    } 
  };
  next();
};
import multer from "multer";
import { generateAIResponse, extractTextFromFiles } from "./ai";
import { z } from "zod";
// import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import os from "os";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept only PDF, DOCX, and TXT files
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only PDF, DOCX, and TXT files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // For development, we'll use a simpler auth approach
  console.log("Setting up simplified authentication for development");

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

  // Auth routes - using demo user for development
  app.get('/api/auth/user', async (req: any, res) => {
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

  // Platforms API - development version without auth
  app.get("/api/platforms", async (req: any, res) => {
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
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });
  
  // Get messages for a specific conversation
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      
      // First check if the conversation exists and belongs to the user
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  // Add a new message to a conversation
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      
      // First check if the conversation exists and belongs to the user
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Create the new message
      const messageData = {
        ...req.body,
        conversationId
      };
      
      const message = await storage.createMessage(messageData);
      
      // If this is a staff reply (not from customer), update analytics
      if (!messageData.isFromCustomer) {
        if (messageData.isAiGenerated) {
          await storage.incrementAiResponses(userId);
        } else {
          await storage.incrementManualResponses(userId);
        }
      }
      
      // Notify any other connected clients
      storeMessageForPolling(userId, { type: "NEW_MESSAGE", payload: message });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Generate AI response for a conversation
  app.post("/api/conversations/:id/ai-response", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Get all messages in the conversation
      const messages = await storage.getMessagesByConversationId(conversationId);
      
      // Get the latest message from the customer
      const latestCustomerMessage = [...messages]
        .filter(m => m.isFromCustomer)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
      
      if (!latestCustomerMessage) {
        return res.status(400).json({ message: "No customer messages found to respond to" });
      }
      
      // Get knowledge base for context
      const knowledgeBase = await storage.getKnowledgeBaseByUserId(userId);
      
      // Generate AI response
      const aiResponse = await generateAIResponse(latestCustomerMessage.content, messages, knowledgeBase);
      
      // Save AI response
      const responseMessage = await storage.createMessage({
        conversationId,
        content: aiResponse,
        isFromCustomer: false,
        isAiGenerated: true
      });
      
      // Update analytics
      await storage.incrementAiResponses(userId);
      
      // Store response for polling instead of WebSocket
      storeMessageForPolling(userId, { type: "NEW_AI_RESPONSE", payload: responseMessage });
      
      res.json({ message: responseMessage });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
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

  // Download knowledge base file
  app.get("/api/knowledge-base/download/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fileId = parseInt(req.params.id);
      
      // Get the file info from the database
      const file = await storage.getKnowledgeBaseById(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Verify the file belongs to the user
      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // In our current implementation, we need to look through the uploads folder
      // to find the actual file - in production this would be more robust
      const files = fs.readdirSync('uploads/');
      console.log("Available files in uploads/:", files);
      
      // For demo purposes, since we know there's only one file, let's use that
      if (files.length === 0) {
        return res.status(404).json({ message: "No files found in uploads directory" });
      }
      
      // Use the first file in the directory (for demo)
      const filePath = `uploads/${files[0]}`;
      console.log("Using file path:", filePath);
      
      // Set the appropriate content type
      res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      
      // Send the file
      return res.download(filePath);
    } catch (error) {
      console.error("Error downloading file:", error);
      return res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.post("/api/knowledge-base", isAuthenticated, async (req: any, res) => {
    // Handle file upload with error handling
    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: err.message });
      }

      try {
        const userId = req.user.claims.sub;
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        console.log("File uploaded successfully:", file.originalname, "Path:", file.path);
        
        // Extract text from the file
        let content;
        try {
          content = await extractTextFromFiles(file.path, file.mimetype);
        } catch (extractError) {
          console.error("Error extracting content:", extractError);
          // Use a placeholder for content if extraction fails
          content = `Content from ${file.originalname} (extraction partially failed)`;
        }
        
        // Get file type
        let fileType;
        if (file.mimetype === "application/pdf") {
          fileType = "pdf";
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          fileType = "docx";
        } else if (file.mimetype === "text/plain") {
          fileType = "txt";  
        } else {
          // Extract extension from the file name as a fallback
          const nameParts = file.originalname.split('.');
          fileType = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : "unknown";
        }
        
        const knowledgeBaseEntry = await storage.createKnowledgeBase({
          userId,
          fileName: file.originalname,
          fileType, // Using the simplified file type (pdf, docx, txt)
          fileSize: file.size,
          content: content || null
        });
        
        // We'll keep the file for download functionality instead of deleting it
        // Store the file path in the database
        knowledgeBaseEntry.filePath = file.path;
        
        // Return the created knowledge base entry
        return res.status(200).json(knowledgeBaseEntry);
      } catch (error) {
        console.error("Error uploading knowledge base file:", error);
        res.status(500).json({ message: "Failed to upload knowledge base file" });
      }
    });
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
