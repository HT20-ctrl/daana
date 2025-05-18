import {
  users,
  type User,
  type UpsertUser,
  platforms,
  type Platform,
  type InsertPlatform,
  conversations,
  type Conversation,
  type InsertConversation,
  messages,
  type Message,
  type InsertMessage,
  knowledgeBase,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  analytics,
  type Analytics,
  type InsertAnalytics
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Platform operations
  getPlatformsByUserId(userId: string): Promise<Platform[]>;
  getPlatformById(id: number): Promise<Platform | undefined>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  updatePlatform(id: number, platformData: Partial<InsertPlatform>): Promise<Platform>;
  deletePlatform(id: number): Promise<boolean>; // Add delete platform functionality
  
  // Conversation operations
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // Message operations
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Knowledge Base operations
  getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]>;
  getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined>;
  createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeBase(id: number, data: Partial<KnowledgeBase>): Promise<KnowledgeBase>;
  
  // Analytics operations
  getAnalyticsByUserId(userId: string): Promise<Analytics | undefined>;
  incrementTotalMessages(userId: string): Promise<Analytics>;
  incrementAiResponses(userId: string): Promise<Analytics>;
  incrementManualResponses(userId: string): Promise<Analytics>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private platforms: Map<number, Platform>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private knowledgeBase: Map<number, KnowledgeBase>;
  private analytics: Map<string, Analytics>;
  
  private platformId: number = 1;
  private conversationId: number = 1;
  private messageId: number = 1;
  private knowledgeBaseId: number = 1;

  constructor() {
    this.users = new Map();
    this.platforms = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.knowledgeBase = new Map();
    this.analytics = new Map();
    
    // Initialize with demo data if needed
    this.initDemoData();
  }

  private initDemoData() {
    // Add demo user
    const user: User = {
      id: "1",
      email: "demo@example.com",
      firstName: "Demo",
      lastName: "User",
      role: "admin",
      profileImageUrl: "https://i.pravatar.cc/300?u=demo@example.com",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set("1", user);
    
    // Add sample platforms
    const fb: Platform = {
      id: this.platformId++,
      name: "facebook",
      displayName: "Facebook",
      userId: "1",
      isConnected: true,
      accessToken: "sample-token-facebook",
      refreshToken: null,
      tokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.platforms.set(1, fb);
    
    const ig: Platform = {
      id: this.platformId++,
      name: "instagram",
      displayName: "Instagram",
      userId: "1",
      isConnected: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.platforms.set(2, ig);
    
    const slack: Platform = {
      id: this.platformId++,
      name: "slack",
      displayName: "Slack",
      userId: "1",
      isConnected: true,
      accessToken: "sample-token-slack",
      refreshToken: null,
      tokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.platforms.set(3, slack);
    
    // Add conversations
    const conv1: Conversation = {
      id: this.conversationId++,
      userId: "1",
      platformId: 1,
      customerName: "John Davis",
      customerAvatar: "https://i.pravatar.cc/300?u=john.davis@example.com",
      lastMessage: "Thanks for resolving my issue so quickly!",
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isActive: true,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    };
    this.conversations.set(1, conv1);
    
    const conv2: Conversation = {
      id: this.conversationId++,
      userId: "1",
      platformId: 1,
      customerName: "Sarah Williams",
      customerAvatar: "https://i.pravatar.cc/300?u=sarah.williams@example.com",
      lastMessage: "I'd like to speak with a human agent please.",
      lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      isActive: true,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
    };
    this.conversations.set(2, conv2);
    
    const conv3: Conversation = {
      id: this.conversationId++,
      userId: "1",
      platformId: 3,
      customerName: "Alex Thompson",
      customerAvatar: "https://i.pravatar.cc/300?u=alex.thompson@example.com",
      lastMessage: "When will my order arrive?",
      lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isActive: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    };
    this.conversations.set(3, conv3);
    
    // Add messages for conversation 1
    this.createMessage({
      conversationId: 1,
      content: "Hello, I have a question about my recent order #12345",
      isFromCustomer: true,
      isAiGenerated: false
    });
    
    this.createMessage({
      conversationId: 1,
      content: "Hi John! I'd be happy to help you with your order #12345. What specific information are you looking for?",
      isFromCustomer: false,
      isAiGenerated: true
    });
    
    this.createMessage({
      conversationId: 1,
      content: "I ordered a blue shirt but received a red one. Can I get it exchanged?",
      isFromCustomer: true,
      isAiGenerated: false
    });
    
    this.createMessage({
      conversationId: 1,
      content: "I apologize for the mix-up. I'd be happy to process an exchange for you. I've created a return label that will be emailed to you shortly. Once we receive the red shirt, we'll ship out the blue one immediately.",
      isFromCustomer: false,
      isAiGenerated: true
    });
    
    this.createMessage({
      conversationId: 1,
      content: "Thanks for resolving my issue so quickly!",
      isFromCustomer: true,
      isAiGenerated: false
    });
    
    // Add messages for conversation 2
    this.createMessage({
      conversationId: 2,
      content: "I've been waiting for my refund for two weeks now",
      isFromCustomer: true,
      isAiGenerated: false
    });
    
    this.createMessage({
      conversationId: 2,
      content: "Hello Sarah, I understand your concern about the refund delay. Let me look into this for you. Could you please provide your order number?",
      isFromCustomer: false,
      isAiGenerated: true
    });
    
    this.createMessage({
      conversationId: 2,
      content: "Order #89012. It was supposed to be processed within 5-7 business days.",
      isFromCustomer: true,
      isAiGenerated: false
    });
    
    this.createMessage({
      conversationId: 2,
      content: "Thank you for providing the order number. I can see that your refund for order #89012 was processed on our end, but it may take additional time for your bank to reflect it in your account. This typically takes 5-10 business days depending on your bank's policies.",
      isFromCustomer: false,
      isAiGenerated: true
    });
    
    this.createMessage({
      conversationId: 2,
      content: "I'd like to speak with a human agent please.",
      isFromCustomer: true,
      isAiGenerated: false
    });
    
    // Add message for conversation 3
    this.createMessage({
      conversationId: 3,
      content: "When will my order arrive?",
      isFromCustomer: true,
      isAiGenerated: false
    });
    
    // Add knowledge base items
    const kb1: KnowledgeBase = {
      id: this.knowledgeBaseId++,
      userId: "1",
      fileName: "Return_Policy.pdf",
      fileType: "application/pdf",
      fileSize: 245000,
      content: "Our return policy allows customers to return items within 30 days of purchase for a full refund...",
      filePath: "/uploads/Return_Policy.pdf",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    };
    this.knowledgeBase.set(1, kb1);
    
    const kb2: KnowledgeBase = {
      id: this.knowledgeBaseId++,
      userId: "1",
      fileName: "Shipping_Information.pdf", 
      fileType: "application/pdf",
      fileSize: 180000,
      content: "Standard shipping typically takes 3-5 business days. Express shipping is available for an additional fee...",
      filePath: "/uploads/Shipping_Information.pdf",
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    };
    this.knowledgeBase.set(2, kb2);
    
    // Initialize analytics
    // Count messages
    let totalMessages = 0;
    let aiResponses = 0;
    let manualResponses = 0;
    
    // This will be called before any messages are created
    // We'll manually set these values based on our created messages
    totalMessages = 11; // Total of 11 messages
    aiResponses = 4;    // 4 AI-generated responses
    manualResponses = 0; // No manual responses
    
    const analyticsData: Analytics = {
      id: 1,
      userId: "1",
      totalMessages: totalMessages,
      aiResponses: aiResponses,
      manualResponses: manualResponses,
      sentimentScore: 85,
      date: new Date()
    };
    this.analytics.set("1", analyticsData);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    
    const user: User = {
      id: userData.id,
      email: userData.email ?? existingUser?.email ?? null,
      firstName: userData.firstName ?? existingUser?.firstName ?? null,
      lastName: userData.lastName ?? existingUser?.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? existingUser?.profileImageUrl ?? null,
      role: userData.role ?? existingUser?.role ?? "user",
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(userData.id, user);
    
    // Initialize analytics for new users
    if (!existingUser) {
      this.analytics.set(userData.id, {
        id: 1,
        userId: userData.id,
        totalMessages: 0,
        aiResponses: 0,
        manualResponses: 0,
        sentimentScore: 0,
        date: new Date()
      });
    }
    
    return user;
  }

  // Platform operations
  async getPlatformsByUserId(userId: string): Promise<Platform[]> {
    return Array.from(this.platforms.values()).filter(
      (platform) => platform.userId === userId
    );
  }

  async getPlatformById(id: number): Promise<Platform | undefined> {
    return this.platforms.get(id);
  }

  async createPlatform(platformData: InsertPlatform): Promise<Platform> {
    const id = this.platformId++;
    const platform: Platform = {
      id,
      name: platformData.name,
      userId: platformData.userId,
      displayName: platformData.displayName,
      accessToken: platformData.accessToken || null,
      refreshToken: platformData.refreshToken || null,
      tokenExpiry: platformData.tokenExpiry || null,
      isConnected: platformData.isConnected || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.platforms.set(id, platform);
    return platform;
  }
  
  async updatePlatform(id: number, platformData: Partial<InsertPlatform>): Promise<Platform> {
    const platform = this.platforms.get(id);
    if (!platform) {
      throw new Error(`Platform with ID ${id} not found`);
    }
    
    console.log(`Updating platform ${id}:`, { 
      before: {
        id: platform.id,
        name: platform.name,
        isConnected: platform.isConnected,
        hasToken: !!platform.accessToken
      },
      updates: platformData
    });
    
    // Start with a clean clone of the platform
    const updatedPlatform: Platform = {
      ...platform,
      updatedAt: new Date()
    };
    
    // Override with new data - safely update allowed fields only
    if (platformData.name !== undefined) updatedPlatform.name = platformData.name;
    if (platformData.userId !== undefined) updatedPlatform.userId = platformData.userId;
    if (platformData.displayName !== undefined) updatedPlatform.displayName = platformData.displayName;
    if (platformData.accessToken !== undefined) updatedPlatform.accessToken = platformData.accessToken;
    if (platformData.refreshToken !== undefined) updatedPlatform.refreshToken = platformData.refreshToken;
    if (platformData.tokenExpiry !== undefined) updatedPlatform.tokenExpiry = platformData.tokenExpiry;
    if (platformData.isConnected !== undefined) updatedPlatform.isConnected = platformData.isConnected;
    
    // Special handling for disconnection
    if (platformData.isConnected === false) {
      console.log(`Platform ${id} is being disconnected - explicitly setting connection data to null`);
      updatedPlatform.isConnected = false;
      updatedPlatform.accessToken = null;
      updatedPlatform.refreshToken = null;
      updatedPlatform.tokenExpiry = null;
    }
    
    console.log(`Platform ${id} after update:`, {
      id: updatedPlatform.id,
      name: updatedPlatform.name,
      isConnected: updatedPlatform.isConnected,
      hasToken: !!updatedPlatform.accessToken
    });
    
    // Replace the platform in the map with our updated version
    this.platforms.delete(id);
    this.platforms.set(id, updatedPlatform);
    
    return updatedPlatform;
  }
  
  async deletePlatform(id: number): Promise<boolean> {
    console.log(`Attempting to disconnect platform with ID: ${id}`);
    if (!this.platforms.has(id)) {
      console.log(`Platform ${id} not found`);
      return false;
    }
    
    const platform = this.platforms.get(id);
    if (platform) {
      console.log(`Disconnecting platform: ${platform.name} (ID: ${id})`);
      
      // Instead of deleting the platform, just mark it as disconnected
      // This ensures the platform entry remains visible in the UI
      platform.isConnected = false;
      platform.accessToken = null;
      platform.refreshToken = null;
      platform.tokenExpiry = null;
      platform.updatedAt = new Date();
      
      // Update the platform in the map
      this.platforms.set(id, platform);
      
      console.log(`Platform disconnected successfully: ${platform.name}`);
      return true;
    }
    
    return false;
  }

  // Conversation operations
  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((conversation) => conversation.userId === userId)
      .sort((a, b) => {
        const aTime = a.lastMessageAt?.getTime() || 0;
        const bTime = b.lastMessageAt?.getTime() || 0;
        return bTime - aTime;
      });
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const id = this.conversationId++;
    const conversation: Conversation = {
      id,
      userId: conversationData.userId,
      customerName: conversationData.customerName,
      platformId: conversationData.platformId ?? null,
      customerAvatar: conversationData.customerAvatar ?? null,
      lastMessage: conversationData.lastMessage ?? null,
      lastMessageAt: conversationData.lastMessageAt ?? new Date(),
      isActive: conversationData.isActive ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }

  // Message operations
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return aTime - bTime;
      });
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const message: Message = {
      ...messageData,
      id,
      createdAt: new Date(),
    };
    
    this.messages.set(id, message);
    
    // Update the last message in the conversation
    const conversation = this.conversations.get(messageData.conversationId);
    if (conversation) {
      conversation.lastMessage = messageData.content;
      conversation.lastMessageAt = new Date();
      conversation.updatedAt = new Date();
      this.conversations.set(messageData.conversationId, conversation);
    }
    
    // Update analytics based on message type
    const userId = conversation?.userId;
    if (userId) {
      await this.incrementTotalMessages(userId);
      
      if (!messageData.isFromCustomer) {
        if (messageData.isAiGenerated) {
          await this.incrementAiResponses(userId);
        } else {
          await this.incrementManualResponses(userId);
        }
      }
    }
    
    return message;
  }

  // Knowledge Base operations
  async getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values()).filter(
      (kb) => kb.userId === userId
    );
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    return this.knowledgeBase.get(id);
  }

  async createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = this.knowledgeBaseId++;
    // Ensure all required fields are present with proper types
    const kb: KnowledgeBase = {
      ...knowledgeBaseItem,
      id,
      content: knowledgeBaseItem.content || null,
      filePath: knowledgeBaseItem.filePath || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.knowledgeBase.set(id, kb);
    return kb;
  }

  async updateKnowledgeBase(id: number, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const kb = this.knowledgeBase.get(id);
    
    if (!kb) {
      throw new Error(`Knowledge base with ID ${id} not found`);
    }
    
    const updatedKb = {
      ...kb,
      ...data,
      updatedAt: new Date()
    };
    
    this.knowledgeBase.set(id, updatedKb);
    return updatedKb;
  }

  // Analytics operations
  async getAnalyticsByUserId(userId: string): Promise<Analytics | undefined> {
    return this.analytics.get(userId);
  }

  async incrementTotalMessages(userId: string): Promise<Analytics> {
    const analytics = this.analytics.get(userId);
    
    if (!analytics) {
      const newAnalytics: Analytics = {
        id: 1,
        userId,
        totalMessages: 1,
        aiResponses: 0,
        manualResponses: 0,
        sentimentScore: 0,
        date: new Date()
      };
      
      this.analytics.set(userId, newAnalytics);
      return newAnalytics;
    }
    
    analytics.totalMessages = (analytics.totalMessages || 0) + 1;
    this.analytics.set(userId, analytics);
    return analytics;
  }

  async incrementAiResponses(userId: string): Promise<Analytics> {
    const analytics = this.analytics.get(userId);
    
    if (!analytics) {
      const newAnalytics: Analytics = {
        id: 1,
        userId,
        totalMessages: 1,
        aiResponses: 1,
        manualResponses: 0,
        sentimentScore: 0,
        date: new Date()
      };
      
      this.analytics.set(userId, newAnalytics);
      return newAnalytics;
    }
    
    analytics.totalMessages = (analytics.totalMessages || 0) + 1;
    analytics.aiResponses = (analytics.aiResponses || 0) + 1;
    this.analytics.set(userId, analytics);
    return analytics;
  }

  async incrementManualResponses(userId: string): Promise<Analytics> {
    const analytics = this.analytics.get(userId);
    
    if (!analytics) {
      const newAnalytics: Analytics = {
        id: 1,
        userId,
        totalMessages: 1,
        aiResponses: 0,
        manualResponses: 1,
        sentimentScore: 0,
        date: new Date()
      };
      
      this.analytics.set(userId, newAnalytics);
      return newAnalytics;
    }
    
    analytics.totalMessages = (analytics.totalMessages || 0) + 1;
    analytics.manualResponses = (analytics.manualResponses || 0) + 1;
    this.analytics.set(userId, analytics);
    return analytics;
  }
}

export const storage = new MemStorage();
