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
    // Add demo user if not exists
    const demoUser: UpsertUser = {
      id: "1",
      email: "demo@example.com",
      firstName: "Demo",
      lastName: "User",
      role: "admin",
      profileImageUrl: "https://i.pravatar.cc/300?u=demo@example.com"
    };
    
    this.upsertUser(demoUser);
    
    // Add sample platforms
    const platforms = [
      {
        name: "facebook",
        displayName: "Facebook",
        userId: "1",
        isConnected: true,
        accessToken: "sample-token-facebook",
        refreshToken: null,
        tokenExpiry: null
      },
      {
        name: "instagram",
        displayName: "Instagram",
        userId: "1",
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      },
      {
        name: "slack",
        displayName: "Slack",
        userId: "1",
        isConnected: true,
        accessToken: "sample-token-slack",
        refreshToken: null,
        tokenExpiry: null
      }
    ];
    
    platforms.forEach(platform => this.createPlatform(platform));
    
    // Add sample conversations
    const conversations = [
      {
        userId: "1",
        platformId: 1, // Facebook
        customerName: "John Davis",
        customerAvatar: "https://i.pravatar.cc/300?u=john.davis@example.com",
        lastMessage: "Thanks for resolving my issue so quickly!",
        isActive: true,
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        userId: "1",
        platformId: 1, // Facebook
        customerName: "Sarah Williams",
        customerAvatar: "https://i.pravatar.cc/300?u=sarah.williams@example.com",
        lastMessage: "I'd like to speak with a human agent please.",
        isActive: true,
        lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      },
      {
        userId: "1",
        platformId: 3, // Slack
        customerName: "Alex Thompson",
        customerAvatar: "https://i.pravatar.cc/300?u=alex.thompson@example.com",
        lastMessage: "When will my order arrive?",
        isActive: true,
        lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ];
    
    conversations.forEach(convo => {
      const conversation = this.createConversation(convo);
      
      // Add messages for each conversation
      if (convo.customerName === "John Davis") {
        this.createMessage({
          conversationId: conversation.id,
          content: "Hello, I have a question about my recent order #12345",
          isFromCustomer: true,
          isAiGenerated: false
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "Hi John! I'd be happy to help you with your order #12345. What specific information are you looking for?",
          isFromCustomer: false,
          isAiGenerated: true
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "I ordered a blue shirt but received a red one. Can I get it exchanged?",
          isFromCustomer: true,
          isAiGenerated: false
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "I apologize for the mix-up. I'd be happy to process an exchange for you. I've created a return label that will be emailed to you shortly. Once we receive the red shirt, we'll ship out the blue one immediately.",
          isFromCustomer: false,
          isAiGenerated: true
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "Thanks for resolving my issue so quickly!",
          isFromCustomer: true,
          isAiGenerated: false
        });
      }
      
      if (convo.customerName === "Sarah Williams") {
        this.createMessage({
          conversationId: conversation.id,
          content: "I've been waiting for my refund for two weeks now",
          isFromCustomer: true,
          isAiGenerated: false
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "Hello Sarah, I understand your concern about the refund delay. Let me look into this for you. Could you please provide your order number?",
          isFromCustomer: false,
          isAiGenerated: true
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "Order #89012. It was supposed to be processed within 5-7 business days.",
          isFromCustomer: true,
          isAiGenerated: false
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "Thank you for providing the order number. I can see that your refund for order #89012 was processed on our end, but it may take additional time for your bank to reflect it in your account. This typically takes 5-10 business days depending on your bank's policies.",
          isFromCustomer: false,
          isAiGenerated: true
        });
        
        this.createMessage({
          conversationId: conversation.id,
          content: "I'd like to speak with a human agent please.",
          isFromCustomer: true,
          isAiGenerated: false
        });
      }
      
      if (convo.customerName === "Alex Thompson") {
        this.createMessage({
          conversationId: conversation.id,
          content: "When will my order arrive?",
          isFromCustomer: true,
          isAiGenerated: false
        });
      }
    });
    
    // Initialize analytics
    const analytics: Analytics = {
      id: 1,
      userId: "1",
      totalMessages: 9,
      aiResponses: 3,
      manualResponses: 0,
      sentimentScore: 85,
      date: new Date()
    };
    
    this.analytics.set("1", analytics);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    
    const user: User = {
      ...userData,
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
      ...platformData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.platforms.set(id, platform);
    return platform;
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
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const id = this.conversationId++;
    const conversation: Conversation = {
      ...conversationData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: conversationData.lastMessageAt || new Date(),
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }

  // Message operations
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
      this.conversations.set(messageData.conversationId, {
        ...conversation,
        lastMessage: messageData.content,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      });
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
    const kb: KnowledgeBase = {
      ...knowledgeBaseItem,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.knowledgeBase.set(id, kb);
    return kb;
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
    
    const updatedAnalytics = {
      ...analytics,
      totalMessages: analytics.totalMessages + 1,
    };
    
    this.analytics.set(userId, updatedAnalytics);
    return updatedAnalytics;
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
    
    const updatedAnalytics = {
      ...analytics,
      totalMessages: analytics.totalMessages + 1,
      aiResponses: analytics.aiResponses + 1,
    };
    
    this.analytics.set(userId, updatedAnalytics);
    return updatedAnalytics;
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
    
    const updatedAnalytics = {
      ...analytics,
      totalMessages: analytics.totalMessages + 1,
      manualResponses: analytics.manualResponses + 1,
    };
    
    this.analytics.set(userId, updatedAnalytics);
    return updatedAnalytics;
  }
}

export const storage = new MemStorage();
