import { 
  User, UpsertUser, 
  Platform, InsertPlatform,
  Conversation, InsertConversation,
  Message, InsertMessage,
  KnowledgeBase, InsertKnowledgeBase,
  Analytics, InsertAnalytics
} from "@shared/schema";
import { storage } from "./storage";
import { logger, ApiError } from "./errorHandling";

/**
 * Enhanced storage wrapper with comprehensive error handling
 * Uses the existing storage implementation but adds structured error handling
 */
export class EnhancedStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      return await storage.getUser(id);
    } catch (error) {
      logger.error("Error getting user", { id, error });
      throw ApiError.databaseError("Failed to retrieve user", { 
        operation: "getUser", id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      return await storage.upsertUser(userData);
    } catch (error) {
      logger.error("Error upserting user", { id: userData.id, error });
      throw ApiError.databaseError("Failed to create or update user", { 
        operation: "upsertUser", 
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Platform operations
  async getPlatformsByUserId(userId: string): Promise<Platform[]> {
    try {
      return await storage.getPlatformsByUserId(userId);
    } catch (error) {
      logger.error("Error getting platforms by user", { userId, error });
      throw ApiError.databaseError("Failed to retrieve platforms", { 
        operation: "getPlatformsByUserId", userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getPlatformById(id: number): Promise<Platform | undefined> {
    try {
      return await storage.getPlatformById(id);
    } catch (error) {
      logger.error("Error getting platform by id", { id, error });
      throw ApiError.databaseError("Failed to retrieve platform", { 
        operation: "getPlatformById", id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async createPlatform(platformData: InsertPlatform): Promise<Platform> {
    try {
      return await storage.createPlatform(platformData);
    } catch (error) {
      logger.error("Error creating platform", { userId: platformData.userId, name: platformData.name, error });
      throw ApiError.databaseError("Failed to create platform", { 
        operation: "createPlatform", 
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async updatePlatform(id: number, platformData: Partial<InsertPlatform>): Promise<Platform> {
    try {
      return await storage.updatePlatform(id, platformData);
    } catch (error) {
      logger.error("Error updating platform", { id, error });
      throw ApiError.databaseError("Failed to update platform", { 
        operation: "updatePlatform", id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async deletePlatform(id: number): Promise<boolean> {
    try {
      return await storage.deletePlatform(id);
    } catch (error) {
      logger.error("Error deleting platform", { id, error });
      throw ApiError.databaseError("Failed to delete platform", { 
        operation: "deletePlatform", id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Conversation operations
  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    try {
      return await storage.getConversationsByUserId(userId);
    } catch (error) {
      logger.error("Error getting conversations by user", { userId, error });
      throw ApiError.databaseError("Failed to retrieve conversations", { 
        operation: "getConversationsByUserId", userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    try {
      return await storage.getConversationById(id);
    } catch (error) {
      logger.error("Error getting conversation by id", { id, error });
      throw ApiError.databaseError("Failed to retrieve conversation", { 
        operation: "getConversationById", id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    try {
      return await storage.createConversation(conversationData);
    } catch (error) {
      logger.error("Error creating conversation", { userId: conversationData.userId, error });
      throw ApiError.databaseError("Failed to create conversation", { 
        operation: "createConversation", 
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Message operations
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    try {
      return await storage.getMessagesByConversationId(conversationId);
    } catch (error) {
      logger.error("Error getting messages by conversation", { conversationId, error });
      throw ApiError.databaseError("Failed to retrieve messages", { 
        operation: "getMessagesByConversationId", conversationId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    try {
      return await storage.createMessage(messageData);
    } catch (error) {
      logger.error("Error creating message", { conversationId: messageData.conversationId, error });
      throw ApiError.databaseError("Failed to create message", { 
        operation: "createMessage", 
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Knowledge Base operations
  async getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]> {
    try {
      return await storage.getKnowledgeBaseByUserId(userId);
    } catch (error) {
      logger.error("Error getting knowledge base by user", { userId, error });
      throw ApiError.databaseError("Failed to retrieve knowledge base items", { 
        operation: "getKnowledgeBaseByUserId", userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    try {
      return await storage.getKnowledgeBaseById(id);
    } catch (error) {
      logger.error("Error getting knowledge base item by id", { id, error });
      throw ApiError.databaseError("Failed to retrieve knowledge base item", { 
        operation: "getKnowledgeBaseById", id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase> {
    try {
      return await storage.createKnowledgeBase(knowledgeBaseItem);
    } catch (error) {
      logger.error("Error creating knowledge base item", { userId: knowledgeBaseItem.userId, error });
      throw ApiError.databaseError("Failed to create knowledge base item", { 
        operation: "createKnowledgeBase", 
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async updateKnowledgeBase(id: number, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    try {
      return await storage.updateKnowledgeBase(id, data);
    } catch (error) {
      logger.error("Error updating knowledge base item", { id, error });
      throw ApiError.databaseError("Failed to update knowledge base item", { 
        operation: "updateKnowledgeBase", id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Analytics operations
  async getAnalyticsByUserId(userId: string): Promise<Analytics | undefined> {
    try {
      return await storage.getAnalyticsByUserId(userId);
    } catch (error) {
      logger.error("Error getting analytics by user", { userId, error });
      throw ApiError.databaseError("Failed to retrieve analytics", { 
        operation: "getAnalyticsByUserId", userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async incrementTotalMessages(userId: string): Promise<Analytics> {
    try {
      return await storage.incrementTotalMessages(userId);
    } catch (error) {
      logger.error("Error incrementing total messages", { userId, error });
      throw ApiError.databaseError("Failed to update analytics", { 
        operation: "incrementTotalMessages", userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async incrementAiResponses(userId: string): Promise<Analytics> {
    try {
      return await storage.incrementAiResponses(userId);
    } catch (error) {
      logger.error("Error incrementing AI responses", { userId, error });
      throw ApiError.databaseError("Failed to update analytics", { 
        operation: "incrementAiResponses", userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async incrementManualResponses(userId: string): Promise<Analytics> {
    try {
      return await storage.incrementManualResponses(userId);
    } catch (error) {
      logger.error("Error incrementing manual responses", { userId, error });
      throw ApiError.databaseError("Failed to update analytics", { 
        operation: "incrementManualResponses", userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Export an instance of the enhanced storage
export const enhancedStorage = new EnhancedStorage();