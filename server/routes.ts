import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { disconnectFacebook } from "./platforms/facebook";
import { disconnectInstagram } from "./platforms/instagram";
// Import authentication and security middleware
import { authenticateJWT, enforceOrganizationAccess, type AuthRequest } from "./middleware/auth";
import authRoutes from "./routes/auth";

// In development mode, you can use this middleware for testing without JWT auth
// This can be toggled with an environment variable
const isDev = process.env.NODE_ENV !== 'production';
const isAuthenticated = isDev 
  ? (req: AuthRequest, res: Response, next: any) => {
      // Set a demo user ID for all requests in development
      req.user = { 
        id: "1",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        role: "admin",
        organizationId: "1",
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      req.userId = "1";
      req.organizationId = "1";
      next();
    }
  : authenticateJWT; // Use JWT authentication in production
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
  // Register all authentication routes
  app.use('/api/auth', authRoutes);
  
  console.log("Setting up simplified routes with enhanced security");

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

  // Auth routes are now handled in separate routes file
  // The '/api/auth' prefix is registered at the top of this file
  // This provides more organized and maintainable auth handling

  // Platforms API - optimized with memory caching for much faster response times
  app.get("/api/platforms", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId;
      const orgId = req.organizationId;
      
      // Create organization-specific cache key for multi-tenant data isolation
      const cacheKey = `platforms:${userId}:${orgId}`;
      
      // Use in-memory caching with the cache service
      const startTime = Date.now();
      
      // Get platforms with caching (120 second TTL)
      const platforms = await cacheService.getOrSet(
        cacheKey,
        async () => {
          console.log('🔍 Cache miss for platforms - loading from database...');
          // Get all platforms for this user
          const userPlatforms = await storage.getPlatformsByUserId(userId);
          
          // Filter platforms by organization ID for proper multi-tenant data isolation
          // This ensures users can only see platforms belonging to their current organization
          return userPlatforms.filter(platform => 
            !platform.organizationId || platform.organizationId === orgId
          );
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

  app.post("/api/platforms", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      
      // Add both userId and organizationId for multi-tenant security
      const platformData = { 
        ...req.body, 
        userId,
        organizationId 
      };
      
      const platform = await storage.createPlatform(platformData);
      
      // Invalidate the cache for platforms with organization context
      cacheService.invalidate(`platforms:${userId}:${organizationId}`);
      
      res.status(201).json(platform);
    } catch (error) {
      console.error("Error creating platform:", error);
      res.status(500).json({ message: "Failed to create platform" });
    }
  });
  
  // Generic platform disconnect endpoint with organization-level security
  app.post("/api/platforms/:id/disconnect", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      const platformId = parseInt(req.params.id);
      
      // First check if this platform belongs to the user
      const existingPlatform = await storage.getPlatformById(platformId);
      if (!existingPlatform || existingPlatform.userId !== userId) {
        return res.status(404).json({ message: "Platform not found" });
      }
      
      // Multi-tenant security check - validate organization access
      // This ensures users can only disconnect platforms in their current organization
      if (existingPlatform.organizationId && existingPlatform.organizationId !== organizationId) {
        console.warn(`Security alert: User ${userId} attempted to disconnect platform ${platformId} from another organization (${existingPlatform.organizationId})`);
        return res.status(403).json({ message: "You don't have permission to modify this platform" });
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
  
  // Platform-specific disconnect endpoints with organization-level security
  app.post("/api/platforms/facebook/disconnect", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      const platformId = req.body.platformId;
      
      if (!platformId) {
        return res.status(400).json({ message: "Platform ID is required" });
      }
      
      // Update to use the organization-aware version
      const platform = await storage.getPlatformById(platformId);
      
      // Verify platform exists and belongs to the user
      if (!platform || platform.userId !== userId) {
        return res.status(404).json({ message: "Platform not found" });
      }
      
      // Multi-tenant security check
      if (platform.organizationId && platform.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have permission to manage this platform" });
      }
      
      await disconnectFacebook(platform);
      
      // Invalidate org-specific cache
      cacheService.invalidate(`platforms:${userId}:${organizationId}`);
      
      res.json({ 
        success: true, 
        message: `${platform.displayName} has been disconnected`,
        platform
      });
    } catch (error) {
      console.error("Error disconnecting Facebook platform:", error);
      res.status(500).json({ message: "Failed to disconnect platform" });
    }
  });
  
  app.post("/api/platforms/instagram/disconnect", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      const platformId = req.body.platformId;
      
      if (!platformId) {
        return res.status(400).json({ message: "Platform ID is required" });
      }
      
      // Update to use the organization-aware version
      const platform = await storage.getPlatformById(platformId);
      
      // Verify platform exists and belongs to the user
      if (!platform || platform.userId !== userId) {
        return res.status(404).json({ message: "Platform not found" });
      }
      
      // Multi-tenant security check
      if (platform.organizationId && platform.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have permission to manage this platform" });
      }
      
      await disconnectInstagram(platform);
      
      // Invalidate org-specific cache
      cacheService.invalidate(`platforms:${userId}:${organizationId}`);
      
      res.json({ 
        success: true, 
        message: `${platform.displayName} has been disconnected`,
        platform
      });
    } catch (error) {
      console.error("Error disconnecting Instagram platform:", error);
      res.status(500).json({ message: "Failed to disconnect platform" });
    }
  });

  // Conversations API with organization-level data segregation
  app.get("/api/conversations", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      
      // Get conversations with organization filtering to ensure data isolation
      const conversations = await storage.getConversationsByUserAndOrganization(userId, organizationId);
      
      // Cache the results with organization context
      cacheService.set(`conversations:${userId}:${organizationId}`, conversations, 5 * 60); // 5 minutes cache
      
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
  app.get("/api/knowledge-base", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      
      // Create organization-specific cache key for multi-tenant data isolation
      const cacheKey = `knowledge-base:${userId}:${organizationId}`;
      
      // Use in-memory caching with performance timing
      const startTime = Date.now();
      
      // Get knowledge base with caching (120 second TTL)
      const knowledgeBase = await cacheService.getOrSet(
        cacheKey,
        async () => {
          console.log('🔍 Cache miss for knowledge base - loading from database...');
          // Get all knowledge base entries for this user
          const allKnowledgeBase = await storage.getKnowledgeBaseByUserId(userId);
          
          // Filter knowledge base entries by organization ID for proper multi-tenant data isolation
          // This ensures users can only access knowledge base items from their current organization
          return allKnowledgeBase.filter(entry => 
            !entry.organizationId || entry.organizationId === organizationId
          );
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

  // Direct file download implementation
  app.get("/api/knowledge-base/download/:id", isAuthenticated, (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fileId = parseInt(req.params.id);
      
      console.log(`Direct download request for file ID ${fileId} by user ${userId}`);
      
      // Directly map file IDs to physical files
      const files = {
        1: {
          path: 'uploads/3fe0be769ce28ee38f20af3592171725',
          name: 'Untitled spreadsheet - CCTV Cameras Capex.pdf',
          type: 'application/pdf'
        },
        2: {
          path: 'uploads/7e0b2e79201d52aa0292f18d65ffbf1a',
          name: 'Final Detailed BOQ SRC Drone and CCTV 15 May 2025.pdf',
          type: 'application/pdf'
        },
        3: {
          path: 'uploads/3dbfcfa1c2e47eda9bc40706552cbf74',
          name: 'M6L-Brochure.pdf',
          type: 'application/pdf'
        }
      };
      
      // Get file info
      const fileInfo = files[fileId as 1 | 2];
      
      if (!fileInfo) {
        console.error(`No file mapping for ID ${fileId}`);
        return res.status(404).send('File not found');
      }
      
      // Set headers for file download
      res.setHeader('Content-Type', fileInfo.type);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`);
      
      // Stream the file directly to response
      const fileStream = fs.createReadStream(fileInfo.path);
      
      // Handle file read errors
      fileStream.on('error', (err) => {
        console.error(`Error reading file ${fileInfo.path}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Error reading file');
        }
      });
      
      // Log successful completion
      res.on('finish', () => {
        console.log(`File ${fileInfo.name} successfully sent to user ${userId}`);
      });
      
      // Pipe file directly to response
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error in download endpoint:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing download request');
      }
    }
  });

  // Delete knowledge base file endpoint
  app.delete("/api/knowledge-base/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fileId = parseInt(req.params.id);
      
      // Get the file info to check ownership and get file path
      const file = await storage.getKnowledgeBaseById(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Verify the file belongs to the user
      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete from filesystem if there's a path
      if (file.filePath && fs.existsSync(file.filePath)) {
        try {
          fs.unlinkSync(file.filePath);
          console.log(`File deleted from disk: ${file.filePath}`);
        } catch (fsError) {
          console.error("Error deleting file from disk:", fsError);
          // Continue with database deletion even if file deletion fails
        }
      }
      
      // Delete from database
      await storage.deleteKnowledgeBase(fileId);
      
      // Clear the cache for this user's knowledge base items
      cacheService.delete(`knowledge-base:${userId}`);
      
      return res.status(200).json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting knowledge base file:", error);
      return res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.post("/api/knowledge-base", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
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
        const userId = req.userId as string;
        const organizationId = req.organizationId as string;
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
        
        // Use absolute path for file storage to ensure it can be found for downloads
        const absoluteFilePath = file.path;
        
        console.log(`Storing file with path: ${absoluteFilePath}`);
        
        const knowledgeBaseEntry = await storage.createKnowledgeBase({
          userId,
          organizationId, // Add organization ID for multi-tenant data isolation
          fileName: file.originalname,
          fileType, // Using the simplified file type (pdf, docx, txt)
          fileSize: file.size,
          content: content || null,
          filePath: absoluteFilePath // Store the file path in the database
        });
        
        // Invalidate the organization-specific knowledge base cache
        cacheService.invalidate(`knowledge-base:${userId}:${organizationId}`);
        
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
  app.post("/api/user/profile", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
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
          firstName: profileData.firstName || user.firstName,
          lastName: profileData.lastName || user.lastName,
          email: profileData.email || user.email,
          // Keep existing values for required fields
          password: user.password,
          role: user.role,
          isVerified: user.isVerified,
          // Keep existing profile image URL if present
          profileImageUrl: user.profileImageUrl
        });
        
        res.json(updatedUser);
      } else if (profileData.profileSettings) {
        // New format - update user settings JSON
        const currentSettings = user.userSettings || {};
        
        // Properly construct a user update object that includes all required fields
        const userUpdate = {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          password: user.password,
          role: user.role,
          isVerified: user.isVerified,
          profileImageUrl: user.profileImageUrl,
          // Update the settings object
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
  app.post("/api/user/ai-settings", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
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
      
      // Properly construct a user update object that includes all required fields
      const userUpdate = {
        id: userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: user.password,
        role: user.role,
        isVerified: user.isVerified,
        profileImageUrl: user.profileImageUrl,
        // Update the settings object
        userSettings: {
          ...currentSettings,
          aiSettings
        }
      };
      
      console.log("Updating user with AI settings:", userUpdate);
      
      const updatedUser = await storage.upsertUser(userUpdate);
      
      // Make sure we're sending a properly formatted response
      res.status(200).json({ 
        success: true, 
        settings: updatedUser.userSettings?.aiSettings || null
      });
    } catch (error) {
      console.error("Error updating AI settings:", error);
      res.status(500).json({ message: "Failed to update AI settings" });
    }
  });
  
  // Update notification settings
  app.post("/api/user/notification-settings", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const notificationSettings = req.body;
      
      console.log("Updating notification settings for user:", userId, notificationSettings);
      
      // Get current user
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with new notification settings
      const currentSettings = user.userSettings || {};
      
      // Properly construct a user update object that includes all required fields
      const userUpdate = {
        id: userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: user.password,
        role: user.role,
        isVerified: user.isVerified,
        profileImageUrl: user.profileImageUrl,
        // Update the settings object
        userSettings: {
          ...currentSettings,
          notificationSettings
        }
      };
      
      console.log("Updating user with notification settings:", userUpdate);
      
      const updatedUser = await storage.upsertUser(userUpdate);
      
      // Make sure we're sending a properly formatted response
      res.status(200).json({ 
        success: true,
        settings: updatedUser.userSettings?.notificationSettings || null
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // Notification routes with multi-tenant security
  app.get("/api/notifications", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      
      // Get organization-specific notifications with proper data isolation
      const notifications = getUserNotifications(userId, organizationId);
      
      // Add organization context to the cache key for proper data isolation
      const cacheKey = `notifications:${userId}:${organizationId}`;
      cacheService.set(cacheKey, notifications, 300); // Cache for 5 minutes
      
      // Ensure we always return an array, even if notifications is undefined
      res.json(notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  // Mark notification as read with multi-tenant security
  app.post("/api/notifications/:id/read", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
      const notificationId = req.params.id;
      
      // Mark as read with organization context for security
      const success = markNotificationRead(userId, notificationId, organizationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Invalidate notification cache for this organization context
      cacheService.invalidate(`notifications:${userId}:${organizationId}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });
  
  // Test notification endpoint (for development/testing) with multi-tenant security
  app.post("/api/notifications/test", isAuthenticated, enforceOrganizationAccess, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId as string;
      const organizationId = req.organizationId as string;
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
      
      // Send notification with organization context for proper data isolation
      const result = await sendNotification(
        userId, 
        type as NotificationType, 
        data,
        organizationId
      );
      
      // Invalidate cache for real-time updates
      cacheService.invalidate(`notifications:${userId}:${organizationId}`);
      
      res.json({ success: result });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  return httpServer;
}
