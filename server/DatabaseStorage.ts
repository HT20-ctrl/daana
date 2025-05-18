import { db, formatDate } from "./db";
import { eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import {
  User, UpsertUser,
  Platform, InsertPlatform, 
  Conversation, InsertConversation,
  Message, InsertMessage,
  KnowledgeBase, InsertKnowledgeBase,
  Analytics, InsertAnalytics,
  users, platforms, conversations, messages, knowledgeBase, analytics,
  ConversationType, ConversationStatus, MessageStatus
} from "../shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Platform operations
  getPlatformsByUserId(userId: string): Promise<Platform[]>;
  getPlatformById(id: number): Promise<Platform | undefined>;
  getPlatformByNameAndUserId(name: string, userId: string): Promise<Platform | undefined>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  updatePlatform(id: number, updates: Partial<Platform>): Promise<Platform>;
  deletePlatform(id: number): Promise<boolean>;
  
  // Conversation operations
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  getConversationByExternalId(externalId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation>;
  
  // Message operations
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  getMessageByExternalId(externalId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  createMessageIfNotExists(message: InsertMessage): Promise<Message>;
  
  // Knowledge Base operations
  getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]>;
  getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined>;
  createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase>;
  
  // Analytics operations
  getAnalyticsByUserId(userId: string): Promise<Analytics | undefined>;
  incrementTotalMessages(userId: string): Promise<Analytics>;
  incrementAiResponses(userId: string): Promise<Analytics>;
  incrementManualResponses(userId: string): Promise<Analytics>;
}

export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Handle insert or update
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date()
        }
      })
      .returning();
    
    return user;
  }
  
  // Platform operations
  async getPlatformsByUserId(userId: string): Promise<Platform[]> {
    return await db
      .select()
      .from(platforms)
      .where(eq(platforms.userId, userId))
      .orderBy(platforms.createdAt);
  }

  async getPlatformById(id: number): Promise<Platform | undefined> {
    const [platform] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.id, id));
    
    return platform;
  }

  async getPlatformByNameAndUserId(name: string, userId: string): Promise<Platform | undefined> {
    const [platform] = await db
      .select()
      .from(platforms)
      .where(
        and(
          eq(platforms.name, name),
          eq(platforms.userId, userId)
        )
      );
    
    return platform;
  }

  async createPlatform(platformData: InsertPlatform): Promise<Platform> {
    const [platform] = await db
      .insert(platforms)
      .values({
        ...platformData,
        settings: platformData.settings || {},
        metadata: platformData.metadata || {}
      })
      .returning();
    
    return platform;
  }

  async updatePlatform(id: number, updates: Partial<Platform>): Promise<Platform> {
    const [updatedPlatform] = await db
      .update(platforms)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(platforms.id, id))
      .returning();
    
    return updatedPlatform;
  }

  async deletePlatform(id: number): Promise<boolean> {
    const result = await db
      .delete(platforms)
      .where(eq(platforms.id, id))
      .returning({ id: platforms.id });
    
    return result.length > 0;
  }
  
  // Conversation operations
  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    
    return conversation;
  }

  async getConversationByExternalId(externalId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalId, externalId));
    
    return conversation;
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...conversationData,
        metadata: conversationData.metadata || {},
        status: conversationData.status || ConversationStatus.Active,
        conversationType: conversationData.conversationType || ConversationType.Direct
      })
      .returning();
    
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  // Message operations
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async getMessageByExternalId(externalId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.externalId, externalId));
    
    return message;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        status: messageData.status || MessageStatus.Sent,
        attachments: messageData.attachments || null,
        metadata: messageData.metadata || null
      })
      .returning();
    
    return message;
  }

  async createMessageIfNotExists(messageData: InsertMessage): Promise<Message> {
    // Check if message exists by external ID
    if (messageData.externalId) {
      const existingMessage = await this.getMessageByExternalId(messageData.externalId);
      if (existingMessage) {
        return existingMessage;
      }
    }
    
    // Create new message if it doesn't exist
    return await this.createMessage(messageData);
  }
  
  // Knowledge Base operations
  async getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.userId, userId))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    const [kb] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, id));
    
    return kb;
  }

  async createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [kb] = await db
      .insert(knowledgeBase)
      .values({
        ...knowledgeBaseItem,
        title: knowledgeBaseItem.title || knowledgeBaseItem.fileName,
        keywords: knowledgeBaseItem.keywords || []
      })
      .returning();
    
    return kb;
  }
  
  // Analytics operations
  async getAnalyticsByUserId(userId: string): Promise<Analytics | undefined> {
    const [userAnalytics] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.userId, userId));
    
    return userAnalytics;
  }

  async incrementTotalMessages(userId: string): Promise<Analytics> {
    // Get or create analytics for user
    let userAnalytics = await this.getAnalyticsByUserId(userId);
    
    if (!userAnalytics) {
      // Create initial analytics
      const [newAnalytics] = await db
        .insert(analytics)
        .values({
          userId,
          totalMessages: 1,
          date: new Date()
        })
        .returning();
      
      return newAnalytics;
    } else {
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          totalMessages: (userAnalytics.totalMessages || 0) + 1
        })
        .where(eq(analytics.userId, userId))
        .returning();
      
      return updatedAnalytics;
    }
  }

  async incrementAiResponses(userId: string): Promise<Analytics> {
    // Get or create analytics for user
    let userAnalytics = await this.getAnalyticsByUserId(userId);
    
    if (!userAnalytics) {
      // Create initial analytics
      const [newAnalytics] = await db
        .insert(analytics)
        .values({
          userId,
          aiResponses: 1,
          date: new Date()
        })
        .returning();
      
      return newAnalytics;
    } else {
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          aiResponses: (userAnalytics.aiResponses || 0) + 1
        })
        .where(eq(analytics.userId, userId))
        .returning();
      
      return updatedAnalytics;
    }
  }

  async incrementManualResponses(userId: string): Promise<Analytics> {
    // Get or create analytics for user
    let userAnalytics = await this.getAnalyticsByUserId(userId);
    
    if (!userAnalytics) {
      // Create initial analytics
      const [newAnalytics] = await db
        .insert(analytics)
        .values({
          userId,
          manualResponses: 1,
          date: new Date()
        })
        .returning();
      
      return newAnalytics;
    } else {
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          manualResponses: (userAnalytics.manualResponses || 0) + 1
        })
        .where(eq(analytics.userId, userId))
        .returning();
      
      return updatedAnalytics;
    }
  }
}

// Create the single instance for use throughout the application
export const dbStorage = new DatabaseStorage();