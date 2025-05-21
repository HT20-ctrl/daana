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
  type InsertAnalytics,
  organizations,
  type Organization,
  type InsertOrganization,
  organizationMembers,
  type OrganizationMember,
  type InsertOrganizationMember
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;
  
  // Organization membership operations
  getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>;
  getOrganizationsByUserId(userId: string): Promise<Organization[]>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  updateOrganizationMember(id: number, data: Partial<InsertOrganizationMember>): Promise<OrganizationMember>;
  removeOrganizationMember(id: number): Promise<boolean>;
  
  // Platform operations
  getPlatformsByUserId(userId: string): Promise<Platform[]>;
  getPlatformById(id: number): Promise<Platform | undefined>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  updatePlatform(id: number, platformData: Partial<InsertPlatform>): Promise<Platform>;
  deletePlatform(id: number): Promise<boolean>;
  
  // Conversation operations
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  getConversationsByUserAndOrganization(userId: string, organizationId: string): Promise<Conversation[]>;
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
  deleteKnowledgeBase(id: number): Promise<boolean>;
  
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
  private organizations: Map<string, Organization>;
  private organizationMembers: Map<number, OrganizationMember>;
  
  private platformId: number = 1;
  private conversationId: number = 1;
  private messageId: number = 1;
  private knowledgeBaseId: number = 1;
  private orgMemberId: number = 1;

  constructor() {
    this.users = new Map();
    this.platforms = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.knowledgeBase = new Map();
    this.analytics = new Map();
    this.organizations = new Map();
    this.organizationMembers = new Map();
    
    // Initialize with demo data
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
      userSettings: {
        aiSettings: {
          model: "gpt-4o",
          temperature: 0.7,
          maxTokens: 500,
          responseTimeout: 30,
          enableKnowledgeBase: true,
          fallbackToHuman: true
        },
        notificationSettings: {
          emailNotifications: true,
          desktopNotifications: true,
          newMessageAlerts: true,
          assignmentNotifications: true,
          summaryReports: true
        }
      },
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
      isConnected: false, // Set to false to allow connecting via OAuth
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.platforms.set(1, fb);
    
    const ig: Platform = {
      id: this.platformId++,
      name: "instagram",
      displayName: "Instagram",
      userId: "1",
      isConnected: false, // Set to false by default to allow OAuth connection
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.platforms.set(2, ig);
    
    const slack: Platform = {
      id: this.platformId++,
      name: "slack",
      displayName: "Slack",
      userId: "1",
      isConnected: false, // Set to false by default to allow proper connection
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      metadata: null,
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }
  
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.verificationToken === token) {
        return user;
      }
    }
    return undefined;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.resetToken === token) {
        return user;
      }
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    
    const user: User = {
      id: userData.id,
      email: userData.email ?? existingUser?.email ?? "",
      password: userData.password ?? existingUser?.password ?? null,
      firstName: userData.firstName ?? existingUser?.firstName ?? null,
      lastName: userData.lastName ?? existingUser?.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? existingUser?.profileImageUrl ?? null,
      role: userData.role ?? existingUser?.role ?? "user",
      isVerified: userData.isVerified ?? existingUser?.isVerified ?? false,
      verificationToken: userData.verificationToken ?? existingUser?.verificationToken ?? null,
      resetToken: userData.resetToken ?? existingUser?.resetToken ?? null,
      resetTokenExpiry: userData.resetTokenExpiry ?? existingUser?.resetTokenExpiry ?? null,
      authProvider: userData.authProvider ?? existingUser?.authProvider ?? "local",
      organizationId: userData.organizationId ?? existingUser?.organizationId ?? null,
      userSettings: userData.userSettings ?? existingUser?.userSettings ?? {},
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(userData.id, user);
    
    // Initialize analytics for new users
    if (!existingUser) {
      this.analytics.set(userData.id, {
        id: 1,
        userId: userData.id,
        organizationId: userData.organizationId || null,
        totalMessages: 0,
        aiResponses: 0,
        manualResponses: 0,
        sentimentScore: 0,
        date: new Date()
      });
    }
    
    return user;
  }
  
  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }
  
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const newOrg: Organization = {
      id: orgData.id,
      name: orgData.name,
      plan: orgData.plan || "free",
      logo: orgData.logo || null,
      website: orgData.website || null,
      industry: orgData.industry || null,
      size: orgData.size || null,
      settings: orgData.settings || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.organizations.set(newOrg.id, newOrg);
    return newOrg;
  }
  
  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    const existingOrg = await this.getOrganization(id);
    
    if (!existingOrg) {
      throw new Error(`Organization with id ${id} not found`);
    }
    
    const updatedOrg: Organization = {
      ...existingOrg,
      ...data,
      updatedAt: new Date()
    };
    
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }
  
  // Organization membership operations
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const members: OrganizationMember[] = [];
    
    for (const member of this.organizationMembers.values()) {
      if (member.organizationId === organizationId) {
        members.push(member);
      }
    }
    
    return members;
  }
  
  async getOrganizationsByUserId(userId: string): Promise<Organization[]> {
    const organizations: Organization[] = [];
    
    for (const member of this.organizationMembers.values()) {
      if (member.userId === userId) {
        const organization = await this.getOrganization(member.organizationId);
        if (organization) {
          organizations.push(organization);
        }
      }
    }
    
    return organizations;
  }
  
  async addOrganizationMember(memberData: InsertOrganizationMember): Promise<OrganizationMember> {
    const id = this.orgMemberId++;
    
    const newMember: OrganizationMember = {
      id,
      organizationId: memberData.organizationId,
      userId: memberData.userId,
      role: memberData.role || "member",
      inviteStatus: memberData.inviteStatus || "pending",
      inviteToken: memberData.inviteToken || null,
      inviteExpiry: memberData.inviteExpiry || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.organizationMembers.set(id, newMember);
    return newMember;
  }
  
  async updateOrganizationMember(id: number, data: Partial<InsertOrganizationMember>): Promise<OrganizationMember> {
    const existingMember = this.organizationMembers.get(id);
    
    if (!existingMember) {
      throw new Error(`Organization member with id ${id} not found`);
    }
    
    const updatedMember: OrganizationMember = {
      ...existingMember,
      ...data,
      updatedAt: new Date()
    };
    
    this.organizationMembers.set(id, updatedMember);
    return updatedMember;
  }
  
  async removeOrganizationMember(id: number): Promise<boolean> {
    return this.organizationMembers.delete(id);
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
      metadata: platformData.metadata || null,
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
  
  async getConversationsByUserAndOrganization(userId: string, organizationId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((conversation) => 
        conversation.userId === userId && 
        (!conversation.organizationId || conversation.organizationId === organizationId)
      )
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
      id,
      conversationId: messageData.conversationId,
      content: messageData.content,
      isFromCustomer: messageData.isFromCustomer,
      isAiGenerated: messageData.isAiGenerated ?? null,
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

  // Knowledge Base operations with multi-tenant support
  async getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values()).filter(
      (kb) => kb.userId === userId
    ).map(kb => ({
      ...kb,
      organizationId: kb.organizationId || null
    }));
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    const kb = this.knowledgeBase.get(id);
    if (!kb) return undefined;
    
    return {
      ...kb,
      organizationId: kb.organizationId || null
    };
  }

  async createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = this.knowledgeBaseId++;
    // Ensure all required fields are present with proper types
    const kb: KnowledgeBase = {
      ...knowledgeBaseItem,
      id,
      organizationId: knowledgeBaseItem.organizationId || null,
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
      // Preserve organization context when updating
      organizationId: data.organizationId || kb.organizationId || null,
      updatedAt: new Date()
    };
    
    this.knowledgeBase.set(id, updatedKb);
    return {
      ...updatedKb,
      organizationId: updatedKb.organizationId || null
    };
  }
  
  async deleteKnowledgeBase(id: number): Promise<boolean> {
    if (!this.knowledgeBase.has(id)) {
      return false;
    }
    return this.knowledgeBase.delete(id);
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

/**
 * Database Storage implementation
 * Handles all database interactions using Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error: any) {
      console.error("Error fetching user:", error);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error: any) {
      console.error("Error fetching user by email:", error);
      throw new Error(`Failed to get user by email: ${error.message}`);
    }
  }
  
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
      return user;
    } catch (error: any) {
      console.error("Error fetching user by verification token:", error);
      throw new Error(`Failed to get user by verification token: ${error.message}`);
    }
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.resetToken, token));
      return user;
    } catch (error: any) {
      console.error("Error fetching user by reset token:", error);
      throw new Error(`Failed to get user by reset token: ${error.message}`);
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      console.error("Error upserting user:", error);
      throw new Error(`Failed to upsert user: ${error.message}`);
    }
  }
  
  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    try {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));
      return organization;
    } catch (error: any) {
      console.error("Error fetching organization:", error);
      throw new Error(`Failed to get organization: ${error.message}`);
    }
  }
  
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    try {
      const [organization] = await db
        .insert(organizations)
        .values(orgData)
        .returning();
      return organization;
    } catch (error: any) {
      console.error("Error creating organization:", error);
      throw new Error(`Failed to create organization: ${error.message}`);
    }
  }
  
  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    try {
      const [organization] = await db
        .update(organizations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, id))
        .returning();
      
      if (!organization) {
        throw new Error(`Organization with ID ${id} not found`);
      }
      
      return organization;
    } catch (error: any) {
      console.error("Error updating organization:", error);
      throw new Error(`Failed to update organization: ${error.message}`);
    }
  }
  
  // Organization membership operations
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    try {
      return await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, organizationId));
    } catch (error: any) {
      console.error("Error fetching organization members:", error);
      throw new Error(`Failed to get organization members: ${error.message}`);
    }
  }
  
  async getOrganizationsByUserId(userId: string): Promise<Organization[]> {
    try {
      // First get all membership records for this user
      const memberships = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId));
      
      // If no memberships, return empty array
      if (memberships.length === 0) {
        return [];
      }
      
      // Get all organization IDs from memberships
      const orgIds = memberships.map(membership => membership.organizationId);
      
      // Fetch all organizations matching these IDs
      const orgs = await db
        .select()
        .from(organizations)
        .where(organizations.id.in(orgIds));
      
      return orgs;
    } catch (error: any) {
      console.error("Error fetching user organizations:", error);
      throw new Error(`Failed to get user organizations: ${error.message}`);
    }
  }
  
  async addOrganizationMember(memberData: InsertOrganizationMember): Promise<OrganizationMember> {
    try {
      const [member] = await db
        .insert(organizationMembers)
        .values(memberData)
        .returning();
      return member;
    } catch (error: any) {
      console.error("Error adding organization member:", error);
      throw new Error(`Failed to add organization member: ${error.message}`);
    }
  }
  
  async updateOrganizationMember(id: number, data: Partial<InsertOrganizationMember>): Promise<OrganizationMember> {
    try {
      const [member] = await db
        .update(organizationMembers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(organizationMembers.id, id))
        .returning();
      
      if (!member) {
        throw new Error(`Organization member with ID ${id} not found`);
      }
      
      return member;
    } catch (error: any) {
      console.error("Error updating organization member:", error);
      throw new Error(`Failed to update organization member: ${error.message}`);
    }
  }
  
  async removeOrganizationMember(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(organizationMembers)
        .where(eq(organizationMembers.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error: any) {
      console.error("Error removing organization member:", error);
      throw new Error(`Failed to remove organization member: ${error.message}`);
    }
  }

  // Platform operations
  async getPlatformsByUserId(userId: string): Promise<Platform[]> {
    try {
      return await db
        .select()
        .from(platforms)
        .where(eq(platforms.userId, userId));
    } catch (error: any) {
      console.error("Error fetching platforms by user ID:", error);
      throw new Error(`Failed to get platforms: ${error.message}`);
    }
  }

  async getPlatformById(id: number): Promise<Platform | undefined> {
    try {
      const [platform] = await db
        .select()
        .from(platforms)
        .where(eq(platforms.id, id));
      return platform;
    } catch (error: any) {
      console.error("Error fetching platform by ID:", error);
      throw new Error(`Failed to get platform: ${error.message}`);
    }
  }

  async createPlatform(platformData: InsertPlatform): Promise<Platform> {
    try {
      const platformWithDefaults = {
        ...platformData,
        metadata: platformData.metadata || null
      };
      
      const [platform] = await db
        .insert(platforms)
        .values(platformWithDefaults)
        .returning();
      return platform;
    } catch (error: any) {
      console.error("Error creating platform:", error);
      throw new Error(`Failed to create platform: ${error.message}`);
    }
  }

  async updatePlatform(
    id: number,
    platformData: Partial<InsertPlatform>
  ): Promise<Platform> {
    try {
      // Special handling for disconnection
      if (platformData.isConnected === false) {
        platformData.accessToken = null;
        platformData.refreshToken = null;
        platformData.tokenExpiry = null;
      }

      const [updatedPlatform] = await db
        .update(platforms)
        .set({
          ...platformData,
          updatedAt: new Date(),
        })
        .where(eq(platforms.id, id))
        .returning();

      if (!updatedPlatform) {
        throw new Error(`Platform with ID ${id} not found`);
      }

      return updatedPlatform;
    } catch (error: any) {
      console.error("Error updating platform:", error);
      throw new Error(`Failed to update platform: ${error.message}`);
    }
  }

  async deletePlatform(id: number): Promise<boolean> {
    try {
      // Instead of deleting, we'll update the platform to disconnect it
      await this.updatePlatform(id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
      });
      return true;
    } catch (error) {
      console.error("Error disconnecting platform:", error);
      return false;
    }
  }

  // Conversation operations
  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    try {
      return await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.lastMessageAt));
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw new Error(`Failed to get conversations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getConversationsByUserAndOrganization(userId: string, organizationId: string): Promise<Conversation[]> {
    try {
      // First try with the organization filter
      const result = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, userId),
            eq(conversations.organizationId, organizationId)
          )
        )
        .orderBy(desc(conversations.lastMessageAt));
      
      // For backward compatibility, also get conversations without an organization
      // but only if they belong to this user
      const legacyResult = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, userId),
            sql`${conversations.organizationId} IS NULL`
          )
        )
        .orderBy(desc(conversations.lastMessageAt));
      
      // Combine both results
      return [...result, ...legacyResult];
    } catch (error) {
      console.error("Error fetching conversations by organization:", error);
      throw new Error(`Failed to get conversations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id));
      return conversation;
    } catch (error) {
      console.error("Error fetching conversation:", error);
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    try {
      const [conversation] = await db
        .insert(conversations)
        .values(conversationData)
        .returning();
      return conversation;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  // Message operations
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    try {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    try {
      const [message] = await db.insert(messages).values(messageData).returning();

      // Update conversation with last message
      await db
        .update(conversations)
        .set({
          lastMessage: messageData.content,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, messageData.conversationId));

      // Update analytics
      await this.incrementTotalMessages(messageData.conversationId.toString());
      if (messageData.isAiGenerated) {
        await this.incrementAiResponses(messageData.conversationId.toString());
      } else if (!messageData.isFromCustomer) {
        await this.incrementManualResponses(messageData.conversationId.toString());
      }

      return message;
    } catch (error) {
      console.error("Error creating message:", error);
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  // Knowledge Base operations
  async getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]> {
    try {
      return await db
        .select()
        .from(knowledgeBase)
        .where(eq(knowledgeBase.userId, userId))
        .orderBy(desc(knowledgeBase.updatedAt));
    } catch (error) {
      console.error("Error fetching knowledge base items:", error);
      throw new Error(`Failed to get knowledge base: ${error.message}`);
    }
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    try {
      const [item] = await db
        .select()
        .from(knowledgeBase)
        .where(eq(knowledgeBase.id, id));
      return item;
    } catch (error) {
      console.error("Error fetching knowledge base item:", error);
      throw new Error(`Failed to get knowledge base item: ${error.message}`);
    }
  }

  async createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase> {
    try {
      const [item] = await db
        .insert(knowledgeBase)
        .values(knowledgeBaseItem)
        .returning();
      return item;
    } catch (error) {
      console.error("Error creating knowledge base item:", error);
      throw new Error(`Failed to create knowledge base item: ${error.message}`);
    }
  }

  async updateKnowledgeBase(id: number, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    try {
      const [updatedItem] = await db
        .update(knowledgeBase)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeBase.id, id))
        .returning();

      if (!updatedItem) {
        throw new Error(`Knowledge base item with ID ${id} not found`);
      }

      return updatedItem;
    } catch (error) {
      console.error("Error updating knowledge base item:", error);
      throw new Error(`Failed to update knowledge base item: ${error.message}`);
    }
  }
  
  async deleteKnowledgeBase(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(knowledgeBase)
        .where(eq(knowledgeBase.id, id))
        .returning({ id: knowledgeBase.id });
      
      return result.length > 0;
    } catch (error: any) {
      console.error("Error deleting knowledge base item:", error);
      throw new Error(`Failed to delete knowledge base item: ${error.message}`);
    }
  }

  // Analytics operations
  async getAnalyticsByUserId(userId: string): Promise<Analytics | undefined> {
    try {
      // Explicitly specify columns to avoid missing column errors
      const [analyticsItem] = await db
        .select({
          id: analytics.id,
          userId: analytics.userId,
          totalMessages: analytics.totalMessages,
          aiResponses: analytics.aiResponses,
          manualResponses: analytics.manualResponses,
          sentimentScore: analytics.sentimentScore,
          date: analytics.date
        })
        .from(analytics)
        .where(eq(analytics.userId, userId))
        .orderBy(desc(analytics.date))
        .limit(1);
      
      return analyticsItem;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Return undefined instead of throwing to prevent app crashes
      return undefined;
    }
  }

  async incrementTotalMessages(userId: string): Promise<Analytics> {
    try {
      let analyticsItem = await this.getAnalyticsByUserId(userId);
      
      if (!analyticsItem) {
        // Create new analytics record if none exists
        const [newAnalytics] = await db
          .insert(analytics)
          .values({
            userId,
            totalMessages: 1,
            aiResponses: 0,
            manualResponses: 0,
            sentimentScore: 0,
            date: new Date(),
          })
          .returning();
        
        return newAnalytics;
      }
      
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          totalMessages: (analyticsItem.totalMessages || 0) + 1,
          date: new Date(),
        })
        .where(eq(analytics.id, analyticsItem.id))
        .returning();
      
      return updatedAnalytics;
    } catch (error: any) {
      console.error("Error incrementing total messages:", error);
      throw new Error(`Failed to increment total messages: ${error.message}`);
    }
  }

  async incrementAiResponses(userId: string): Promise<Analytics> {
    try {
      let analyticsItem = await this.getAnalyticsByUserId(userId);
      
      if (!analyticsItem) {
        // Create new analytics record if none exists
        const [newAnalytics] = await db
          .insert(analytics)
          .values({
            userId,
            totalMessages: 1,
            aiResponses: 1,
            manualResponses: 0,
            sentimentScore: 0,
            date: new Date(),
          })
          .returning();
        
        return newAnalytics;
      }
      
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          aiResponses: (analyticsItem.aiResponses || 0) + 1,
          date: new Date(),
        })
        .where(eq(analytics.id, analyticsItem.id))
        .returning();
      
      return updatedAnalytics;
    } catch (error: any) {
      console.error("Error incrementing AI responses:", error);
      throw new Error(`Failed to increment AI responses: ${error.message}`);
    }
  }

  async incrementManualResponses(userId: string): Promise<Analytics> {
    try {
      let analyticsItem = await this.getAnalyticsByUserId(userId);
      
      if (!analyticsItem) {
        // Create new analytics record if none exists
        const [newAnalytics] = await db
          .insert(analytics)
          .values({
            userId,
            totalMessages: 1,
            aiResponses: 0,
            manualResponses: 1,
            sentimentScore: 0,
            date: new Date(),
          })
          .returning();
        
        return newAnalytics;
      }
      
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          manualResponses: (analyticsItem.manualResponses || 0) + 1,
          date: new Date(),
        })
        .where(eq(analytics.id, analyticsItem.id))
        .returning();
      
      return updatedAnalytics;
    } catch (error: any) {
      console.error("Error incrementing manual responses:", error);
      throw new Error(`Failed to increment manual responses: ${error.message}`);
    }
  }
}

// Use DatabaseStorage for production, MemStorage for development/testing
export const storage = process.env.NODE_ENV === 'test' 
  ? new MemStorage()
  : new DatabaseStorage();
