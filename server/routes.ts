import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { disconnectFacebook } from "./platforms/facebook";
import { disconnectInstagram } from "./platforms/instagram";
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
import { 
  getUserNotifications, 
  markNotificationRead,
  sendNotification,
  type NotificationType,
  type NotificationData
} from './services/notificationService';
import { cacheService } from './services/cacheService';
//import { 
//  platformQueries, 
//  knowledgeBaseQueries 
//} from './query-optimizations';
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

  // Platforms API - optimized with memory caching for much faster response times
  app.get("/api/platforms", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cacheKey = `platforms:${userId}`;
      
      // Use in-memory caching with the cache service
      const startTime = Date.now();
      
      // Get platforms with caching (120 second TTL)
      const platforms = await cacheService.getOrSet(
        cacheKey,
        async () => {
          console.log('🔍 Cache miss for platforms - loading from database...');
          return await storage.getPlatformsByUserId(userId);
        },
        120 // Cache for 2 minutes to improve performance
      );
      
      const queryTime = Date.now() - startTime;
      
      if (queryTime > 200) {
        console.log(`⏱️ Platforms query performance: ${queryTime}ms`);
      }
      
      // Add cache headers for client-side caching as well
      res.setHeader('Cache-Control', 'private, max-age=60');
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
  
  // Generic platform disconnect endpoint
  app.post("/api/platforms/:id/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const platformId = parseInt(req.params.id);
      
      // First check if this platform belongs to the user
      const existingPlatform = await storage.getPlatformById(platformId);
      if (!existingPlatform || existingPlatform.userId !== userId) {
        return res.status(404).json({ message: "Platform not found" });
      }
      
      console.log(`Generic disconnect for platform ${platformId} (${existingPlatform.name})`);
      
      // Update the platform to disconnect it
      const updatedPlatform = await storage.updatePlatform(platformId, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
      
      res.json({ 
        success: true, 
        message: `${existingPlatform.displayName} has been disconnected`,
        platform: updatedPlatform
      });
    } catch (error) {
      console.error("Error disconnecting platform:", error);
      res.status(500).json({ message: "Failed to disconnect platform" });
    }
  });
  
  // Platform-specific disconnect endpoints
  app.post("/api/platforms/facebook/disconnect", isAuthenticated, disconnectFacebook);
  app.post("/api/platforms/instagram/disconnect", isAuthenticated, disconnectInstagram);

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

  // Messages AI endpoint to handle the client request
  app.get("/api/messages/ai", isAuthenticated, async (req: any, res) => {
    try {
      // Return empty array for polling
      res.json([]);
    } catch (error) {
      console.error("Error with messages/ai endpoint:", error);
      res.status(500).json({ message: "Failed to process AI messages request" });
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

  // Knowledge Base API - Optimized with memory caching for significantly faster responses
  app.get("/api/knowledge-base", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cacheKey = `knowledge-base:${userId}`;
      
      // Use in-memory caching with performance timing
      const startTime = Date.now();
      
      // Get knowledge base with caching (120 second TTL)
      const knowledgeBase = await cacheService.getOrSet(
        cacheKey,
        async () => {
          console.log('🔍 Cache miss for knowledge base - loading from database...');
          return await storage.getKnowledgeBaseByUserId(userId);
        },
        120 // Cache for 2 minutes to improve performance
      );
      
      const queryTime = Date.now() - startTime;
      
      if (queryTime > 200) {
        console.log(`⏱️ Knowledge base query performance: ${queryTime}ms`);
      }
      
      // Add cache headers for client-side caching as well
      res.setHeader('Cache-Control', 'private, max-age=30');
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
      
      // Use the file path stored in the database
      if (!file.filePath) {
        return res.status(404).json({ message: "File path not found in database" });
      }
      
      // Check if the file exists
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }
      
      const filePath = file.filePath;
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
    console.log("Knowledge base file upload request received", {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      body: req.body ? 'Has body' : 'No body',
      files: req.files ? 'Has files' : 'No files'
    });
    
    // Handle file upload with error handling
    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: err.message });
      }

      try {
        const userId = req.user.claims.sub;
        console.log("Processing upload for user:", userId);
        const file = req.file;
        
        if (!file) {
          console.error("No file found in request");
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        console.log("File uploaded successfully:", {
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
        
        // Extract text from the file
        let content;
        try {
          console.log("Attempting to extract text from:", file.path);
          content = await extractTextFromFiles(file.path, file.mimetype);
          console.log("Text extraction successful, content length:", content.length);
        } catch (extractError) {
          console.error("Error extracting content:", extractError);
          // Use a placeholder for content if extraction fails
          content = `Content from ${file.originalname} (extraction partially failed)`;
          console.log("Using fallback content");
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
          content: content || null,
          filePath: file.path // Store the file path in the database
        });
        
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
  
  // User settings endpoints
  
  // Update user profile
  app.post("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = req.body;
      
      console.log("Updating user profile:", { userId, profileData });
      
      // Get current user to merge settings
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Handle both old format and new format profile updates
      if (profileData.firstName || profileData.lastName || profileData.email) {
        // Old format - update user fields directly
        const updatedUser = await storage.upsertUser({
          id: userId,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          // Keep existing profile image URL if present
          profileImageUrl: req.user.claims.profile_image_url || null
        });
        
        res.json(updatedUser);
      } else if (profileData.profileSettings) {
        // New format - update user settings JSON
        const currentSettings = user.userSettings || {};
        
        // Create a clean record with just the ID and userSettings
        const userUpdate = {
          id: userId,
          userSettings: {
            ...currentSettings,
            profileSettings: profileData.profileSettings
          }
        };
        
        console.log("Updating user with profile settings:", userUpdate);
        
        const updatedUser = await storage.upsertUser(userUpdate);
        
        // Make sure we're sending a properly formatted response
        res.status(200).json({ 
          success: true,
          settings: updatedUser.userSettings
        });
      } else {
        res.status(400).json({ message: "Invalid profile data format" });
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  // Update AI settings - we'll store these in a new userSettings field in the User model
  app.post("/api/user/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const aiSettings = req.body;
      
      console.log("Updating AI settings for user:", userId, aiSettings);
      
      // Get current user
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with new AI settings
      // In a real implementation, we would have a separate table for user settings
      // For this demo, we'll store settings in a userSettings field
      const currentSettings = user.userSettings || {};
      
      // Create a clean record with just the ID and userSettings
      const userUpdate = {
        id: userId,
        userSettings: {
          ...currentSettings,
          aiSettings
        }
      };
      
      console.log("Updating user with AI settings:", userUpdate);
      
      const updatedUser = await storage.upsertUser(userUpdate);
      
      // Make sure we're sending a properly formatted response
      const userWithSettings = updatedUser as any;
      res.status(200).json({ 
        success: true, 
        settings: userWithSettings.userSettings?.aiSettings || null
      });
    } catch (error) {
      console.error("Error updating AI settings:", error);
      res.status(500).json({ message: "Failed to update AI settings" });
    }
  });
  
  // Update notification settings
  app.post("/api/user/notification-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationSettings = req.body;
      
      console.log("Updating notification settings for user:", userId, notificationSettings);
      
      // Get current user
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with new notification settings
      const currentSettings = user.userSettings || {};
      
      // Create a clean record with just the ID and userSettings
      const userUpdate = {
        id: userId,
        userSettings: {
          ...currentSettings,
          notificationSettings
        }
      };
      
      console.log("Updating user with notification settings:", userUpdate);
      
      const updatedUser = await storage.upsertUser(userUpdate);
      
      // Make sure we're sending a properly formatted response
      const userWithSettings = updatedUser as any;
      res.status(200).json({ 
        success: true,
        settings: userWithSettings.userSettings?.notificationSettings || null
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = getUserNotifications(userId);
      // Ensure we always return an array, even if notifications is undefined
      res.json(notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  // Mark notification as read
  app.post("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = req.params.id;
      
      const success = markNotificationRead(userId, notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });
  
  // Test notification endpoint (for development/testing)
  app.post("/api/notifications/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, title, message, link } = req.body;
      
      if (!type || !title || !message) {
        return res.status(400).json({ 
          message: "Missing required fields: type, title, message" 
        });
      }
      
      const data: NotificationData = {
        title,
        message,
        link
      };
      
      const result = await sendNotification(
        userId, 
        type as NotificationType, 
        data
      );
      
      res.json({ success: result });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  return httpServer;
}
