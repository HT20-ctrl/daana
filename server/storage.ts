/**
 * Storage implementation for the Dana AI platform
 * This module provides data access for all application entities
 */
import { 
  users, type User, type UpsertUser,
  platforms, type Platform, type InsertPlatform,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage,
  knowledgeBase, type KnowledgeBase, type InsertKnowledgeBase,
  analytics, type Analytics, type InsertAnalytics,
  organizations, type Organization, type InsertOrganization,
  organizationMembers, type OrganizationMember, type InsertOrganizationMember
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * In-memory storage implementation for development
 * This allows the application to run without a database connection
 */
class MemStorage {
  private users: Map<string, User> = new Map();
  private platforms: Map<number, Platform> = new Map();
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  private knowledgeBase: Map<number, KnowledgeBase> = new Map();
  private analytics: Map<string, Analytics> = new Map();
  private organizations: Map<string, Organization> = new Map();
  private organizationMembers: Map<number, OrganizationMember> = new Map();
  
  private platformIdCounter = 1;
  private conversationIdCounter = 1;
  private messageIdCounter = 1;
  private knowledgeBaseIdCounter = 1;
  private organizationMemberIdCounter = 1;

  constructor() {
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo user
    const demoUser: User = {
      id: "1",
      email: "demo@example.com",
      firstName: "Demo",
      lastName: "User",
      profileImageUrl: null,
      password: null,
      role: "admin",
      isVerified: true,
      verificationToken: null,
      resetToken: null,
      resetTokenExpiry: null,
      authProvider: "local",
      organizationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userSettings: {
        aiSettings: {
          model: "gpt-4o",
          temperature: 0.7,
          maxTokens: 2048,
          responseTimeout: 30000,
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
      }
    };
    this.users.set(demoUser.id, demoUser);

    // Create demo organization
    const demoOrg: Organization = {
      id: "1",
      name: "Demo Organization",
      plan: "professional",
      logo: null,
      website: null,
      industry: null,
      size: null,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.organizations.set(demoOrg.id, demoOrg);

    // Add user to organization
    const demoOrgMember: OrganizationMember = {
      id: 1,
      organizationId: demoOrg.id,
      userId: demoUser.id,
      role: "admin",
      inviteStatus: "accepted",
      inviteToken: null,
      inviteExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.organizationMembers.set(demoOrgMember.id, demoOrgMember);

    // Create demo platforms
    const platforms = [
      {
        id: this.platformIdCounter++,
        userId: demoUser.id,
        organizationId: demoOrg.id,
        name: "facebook",
        displayName: "Facebook",
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        isConnected: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.platformIdCounter++,
        userId: demoUser.id,
        organizationId: demoOrg.id,
        name: "instagram",
        displayName: "Instagram",
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        isConnected: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.platformIdCounter++,
        userId: demoUser.id,
        organizationId: demoOrg.id,
        name: "whatsapp",
        displayName: "WhatsApp",
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        isConnected: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    platforms.forEach(platform => {
      this.platforms.set(platform.id, platform);
    });

    // Create demo conversations
    const conversations = [
      {
        id: this.conversationIdCounter++,
        userId: demoUser.id,
        organizationId: demoOrg.id,
        platformId: 1, // Facebook
        customerName: "John Smith",
        customerAvatar: null,
        lastMessage: "Hi, I'm interested in your product. Can you tell me more?",
        lastMessageAt: new Date(Date.now() - 3600000), // 1 hour ago
        isActive: true,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        id: this.conversationIdCounter++,
        userId: demoUser.id,
        organizationId: demoOrg.id,
        platformId: 2, // Instagram
        customerName: "Sarah Johnson",
        customerAvatar: null,
        lastMessage: "Do you ship internationally?",
        lastMessageAt: new Date(Date.now() - 7200000), // 2 hours ago
        isActive: true,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        updatedAt: new Date(Date.now() - 7200000) // 2 hours ago
      }
    ];

    conversations.forEach(conversation => {
      this.conversations.set(conversation.id, conversation);
    });

    // Create demo messages
    const messages = [
      {
        id: this.messageIdCounter++,
        conversationId: 1,
        content: "Hi, I'm interested in your product. Can you tell me more?",
        isFromCustomer: true,
        isAiGenerated: false,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        id: this.messageIdCounter++,
        conversationId: 2,
        content: "Do you ship internationally?",
        isFromCustomer: true,
        isAiGenerated: false,
        createdAt: new Date(Date.now() - 7200000) // 2 hours ago
      }
    ];

    messages.forEach(message => {
      this.messages.set(message.id, message);
    });

    // Create demo analytics
    const demoAnalytics: Analytics = {
      id: 1,
      userId: demoUser.id,
      organizationId: demoOrg.id,
      totalMessages: 10,
      aiResponses: 7,
      manualResponses: 3,
      sentimentScore: 85,
      date: new Date()
    };
    this.analytics.set(demoUser.id, demoAnalytics);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = userData.id ? this.users.get(userData.id) : undefined;
    
    const user: User = {
      ...existingUser,
      ...userData,
      updatedAt: new Date()
    };
    
    if (!existingUser) {
      user.createdAt = new Date();
    }
    
    this.users.set(user.id, user);
    return user;
  }

  // Platform methods
  async getPlatformsByUserId(userId: string): Promise<Platform[]> {
    return Array.from(this.platforms.values())
      .filter(platform => platform.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getPlatformById(id: number): Promise<Platform | undefined> {
    return this.platforms.get(id);
  }

  async createPlatform(platformData: InsertPlatform): Promise<Platform> {
    const id = this.platformIdCounter++;
    const platform: Platform = {
      id,
      ...platformData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.platforms.set(id, platform);
    return platform;
  }

  async updatePlatform(id: number, platformData: Partial<InsertPlatform>): Promise<Platform> {
    const existingPlatform = this.platforms.get(id);
    if (!existingPlatform) {
      throw new Error(`Platform with ID ${id} not found`);
    }
    
    const updatedPlatform: Platform = {
      ...existingPlatform,
      ...platformData,
      updatedAt: new Date()
    };
    
    this.platforms.set(id, updatedPlatform);
    return updatedPlatform;
  }

  async deletePlatform(id: number): Promise<boolean> {
    return this.platforms.delete(id);
  }

  // Conversation methods
  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conversation => conversation.userId === userId)
      .sort((a, b) => {
        const dateA = a.lastMessageAt ? a.lastMessageAt.getTime() : a.updatedAt.getTime();
        const dateB = b.lastMessageAt ? b.lastMessageAt.getTime() : b.updatedAt.getTime();
        return dateB - dateA;
      });
  }

  async getConversationsByUserAndOrganization(userId: string, organizationId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conversation => 
        conversation.userId === userId && 
        (!conversation.organizationId || conversation.organizationId === organizationId)
      )
      .sort((a, b) => {
        const dateA = a.lastMessageAt ? a.lastMessageAt.getTime() : a.updatedAt.getTime();
        const dateB = b.lastMessageAt ? b.lastMessageAt.getTime() : b.updatedAt.getTime();
        return dateB - dateA;
      });
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const id = this.conversationIdCounter++;
    const conversation: Conversation = {
      id,
      ...conversationData,
      lastMessageAt: conversationData.lastMessageAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  // Message methods
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      id,
      ...messageData,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    
    // Update the conversation's last message
    const conversation = this.conversations.get(messageData.conversationId);
    if (conversation) {
      conversation.lastMessage = messageData.content;
      conversation.lastMessageAt = new Date();
      conversation.updatedAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }
    
    return message;
  }

  // Knowledge Base methods
  async getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    return this.knowledgeBase.get(id);
  }

  async createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = this.knowledgeBaseIdCounter++;
    const item: KnowledgeBase = {
      id,
      ...knowledgeBaseItem,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.knowledgeBase.set(id, item);
    return item;
  }

  async updateKnowledgeBase(id: number, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const existingItem = this.knowledgeBase.get(id);
    if (!existingItem) {
      throw new Error(`Knowledge base item with ID ${id} not found`);
    }
    
    const updatedItem: KnowledgeBase = {
      ...existingItem,
      ...data,
      updatedAt: new Date()
    };
    
    this.knowledgeBase.set(id, updatedItem);
    return updatedItem;
  }

  async deleteKnowledgeBase(id: number): Promise<boolean> {
    return this.knowledgeBase.delete(id);
  }

  // Analytics methods
  async getAnalyticsByUserId(userId: string): Promise<Analytics | undefined> {
    return this.analytics.get(userId);
  }

  async incrementTotalMessages(userId: string): Promise<Analytics> {
    let analytics = this.analytics.get(userId);
    
    if (!analytics) {
      analytics = {
        id: 1,
        userId,
        organizationId: null,
        totalMessages: 0,
        aiResponses: 0,
        manualResponses: 0,
        sentimentScore: 0,
        date: new Date()
      };
    }
    
    analytics.totalMessages += 1;
    this.analytics.set(userId, analytics);
    return analytics;
  }

  async incrementAiResponses(userId: string): Promise<Analytics> {
    let analytics = this.analytics.get(userId);
    
    if (!analytics) {
      analytics = {
        id: 1,
        userId,
        organizationId: null,
        totalMessages: 0,
        aiResponses: 0,
        manualResponses: 0,
        sentimentScore: 0,
        date: new Date()
      };
    }
    
    analytics.aiResponses += 1;
    this.analytics.set(userId, analytics);
    return analytics;
  }

  async incrementManualResponses(userId: string): Promise<Analytics> {
    let analytics = this.analytics.get(userId);
    
    if (!analytics) {
      analytics = {
        id: 1,
        userId,
        organizationId: null,
        totalMessages: 0,
        aiResponses: 0,
        manualResponses: 0,
        sentimentScore: 0,
        date: new Date()
      };
    }
    
    analytics.manualResponses += 1;
    this.analytics.set(userId, analytics);
    return analytics;
  }

  // Organization methods
  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getOrganizationsByUserId(userId: string): Promise<Organization[]> {
    // Find all organization memberships for this user
    const memberships = Array.from(this.organizationMembers.values())
      .filter(member => member.userId === userId && member.inviteStatus === "accepted");
    
    // Get the organizations for these memberships
    return memberships
      .map(member => this.organizations.get(member.organizationId))
      .filter((org): org is Organization => org !== undefined);
  }

  async createOrganization(organizationData: Partial<InsertOrganization>): Promise<Organization> {
    const id = organizationData.id || nanoid();
    const organization: Organization = {
      id,
      name: organizationData.name || "New Organization",
      plan: organizationData.plan || "free",
      logo: organizationData.logo || null,
      website: organizationData.website || null,
      industry: organizationData.industry || null,
      size: organizationData.size || null,
      settings: organizationData.settings || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.organizations.set(id, organization);
    return organization;
  }

  async updateOrganization(id: string, data: Partial<Organization>): Promise<Organization> {
    const existingOrg = this.organizations.get(id);
    if (!existingOrg) {
      throw new Error(`Organization with ID ${id} not found`);
    }
    
    const updatedOrg: Organization = {
      ...existingOrg,
      ...data,
      updatedAt: new Date()
    };
    
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }

  // Organization members methods
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    return Array.from(this.organizationMembers.values())
      .filter(member => member.organizationId === organizationId);
  }

  async addOrganizationMember(memberData: Partial<InsertOrganizationMember>): Promise<OrganizationMember> {
    if (!memberData.organizationId || !memberData.userId) {
      throw new Error("Organization ID and User ID are required");
    }
    
    const id = this.organizationMemberIdCounter++;
    const member: OrganizationMember = {
      id,
      organizationId: memberData.organizationId,
      userId: memberData.userId,
      role: memberData.role || "member",
      inviteStatus: memberData.inviteStatus || "accepted",
      inviteToken: memberData.inviteToken || null,
      inviteExpiry: memberData.inviteExpiry || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.organizationMembers.set(id, member);
    return member;
  }

  async removeOrganizationMember(id: number): Promise<boolean> {
    return this.organizationMembers.delete(id);
  }
}

/**
 * Database storage implementation for production
 * This uses the database connection to store and retrieve data
 */
class DatabaseStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists
    const existingUser = userData.id ? await this.getUser(userData.id) : undefined;
    
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date()
        })
        .where(eq(users.id, userData.id))
        .returning();
      
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newUser;
    }
  }

  // Platform methods
  async getPlatformsByUserId(userId: string): Promise<Platform[]> {
    return db
      .select()
      .from(platforms)
      .where(eq(platforms.userId, userId))
      .orderBy(desc(platforms.updatedAt));
  }

  async getPlatformById(id: number): Promise<Platform | undefined> {
    const [platform] = await db.select().from(platforms).where(eq(platforms.id, id));
    return platform;
  }

  async createPlatform(platformData: InsertPlatform): Promise<Platform> {
    const [platform] = await db
      .insert(platforms)
      .values({
        ...platformData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return platform;
  }

  async updatePlatform(id: number, platformData: Partial<InsertPlatform>): Promise<Platform> {
    const [updatedPlatform] = await db
      .update(platforms)
      .set({
        ...platformData,
        updatedAt: new Date()
      })
      .where(eq(platforms.id, id))
      .returning();
    
    return updatedPlatform;
  }

  async deletePlatform(id: number): Promise<boolean> {
    const result = await db.delete(platforms).where(eq(platforms.id, id));
    return result.rowCount > 0;
  }

  // Conversation methods
  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversationsByUserAndOrganization(userId: string, organizationId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.organizationId, organizationId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...conversationData,
        lastMessageAt: conversationData.lastMessageAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return conversation;
  }

  // Message methods
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(sql`${messages.createdAt} asc`);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        createdAt: new Date()
      })
      .returning();
    
    // Update the conversation's last message
    await db
      .update(conversations)
      .set({
        lastMessage: messageData.content,
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conversations.id, messageData.conversationId));
    
    return message;
  }

  // Knowledge Base methods
  async getKnowledgeBaseByUserId(userId: string): Promise<KnowledgeBase[]> {
    return db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.userId, userId))
      .orderBy(desc(knowledgeBase.updatedAt));
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    const [item] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    return item;
  }

  async createKnowledgeBase(knowledgeBaseItem: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [item] = await db
      .insert(knowledgeBase)
      .values({
        ...knowledgeBaseItem,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return item;
  }

  async updateKnowledgeBase(id: number, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const [updatedItem] = await db
      .update(knowledgeBase)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(knowledgeBase.id, id))
      .returning();
    
    return updatedItem;
  }

  async deleteKnowledgeBase(id: number): Promise<boolean> {
    const result = await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
    return result.rowCount > 0;
  }

  // Analytics methods
  async getAnalyticsByUserId(userId: string): Promise<Analytics | undefined> {
    const [analytics] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.userId, userId))
      .orderBy(desc(analytics.date))
      .limit(1);
    
    return analytics;
  }

  async incrementTotalMessages(userId: string): Promise<Analytics> {
    // Get current analytics or create new
    let userAnalytics = await this.getAnalyticsByUserId(userId);
    
    if (!userAnalytics) {
      // Create new analytics record
      const [newAnalytics] = await db
        .insert(analytics)
        .values({
          userId,
          totalMessages: 1,
          aiResponses: 0,
          manualResponses: 0,
          sentimentScore: 0,
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
        .where(eq(analytics.id, userAnalytics.id))
        .returning();
      
      return updatedAnalytics;
    }
  }

  async incrementAiResponses(userId: string): Promise<Analytics> {
    // Get current analytics or create new
    let userAnalytics = await this.getAnalyticsByUserId(userId);
    
    if (!userAnalytics) {
      // Create new analytics record
      const [newAnalytics] = await db
        .insert(analytics)
        .values({
          userId,
          totalMessages: 1,
          aiResponses: 1,
          manualResponses: 0,
          sentimentScore: 0,
          date: new Date()
        })
        .returning();
      
      return newAnalytics;
    } else {
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          totalMessages: (userAnalytics.totalMessages || 0) + 1,
          aiResponses: (userAnalytics.aiResponses || 0) + 1
        })
        .where(eq(analytics.id, userAnalytics.id))
        .returning();
      
      return updatedAnalytics;
    }
  }

  async incrementManualResponses(userId: string): Promise<Analytics> {
    // Get current analytics or create new
    let userAnalytics = await this.getAnalyticsByUserId(userId);
    
    if (!userAnalytics) {
      // Create new analytics record
      const [newAnalytics] = await db
        .insert(analytics)
        .values({
          userId,
          totalMessages: 1,
          aiResponses: 0,
          manualResponses: 1,
          sentimentScore: 0,
          date: new Date()
        })
        .returning();
      
      return newAnalytics;
    } else {
      // Update existing analytics
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          totalMessages: (userAnalytics.totalMessages || 0) + 1,
          manualResponses: (userAnalytics.manualResponses || 0) + 1
        })
        .where(eq(analytics.id, userAnalytics.id))
        .returning();
      
      return updatedAnalytics;
    }
  }

  // Organization methods
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }

  async getOrganizationsByUserId(userId: string): Promise<Organization[]> {
    // Find all organization memberships for this user
    const memberships = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.inviteStatus, "accepted")
        )
      );
    
    if (memberships.length === 0) {
      return [];
    }
    
    // Get the organizations for these memberships
    const orgIds = memberships.map(member => member.organizationId);
    const orgs = await Promise.all(
      orgIds.map(async (orgId) => {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
        return org;
      })
    );
    
    return orgs.filter((org): org is Organization => org !== undefined);
  }

  async createOrganization(organizationData: Partial<InsertOrganization>): Promise<Organization> {
    const id = organizationData.id || nanoid();
    
    const [organization] = await db
      .insert(organizations)
      .values({
        id,
        name: organizationData.name || "New Organization",
        plan: organizationData.plan || "free",
        logo: organizationData.logo || null,
        website: organizationData.website || null,
        industry: organizationData.industry || null,
        size: organizationData.size || null,
        settings: organizationData.settings || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return organization;
  }

  async updateOrganization(id: string, data: Partial<Organization>): Promise<Organization> {
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, id))
      .returning();
    
    return updatedOrg;
  }

  // Organization members methods
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    return db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
  }

  async addOrganizationMember(memberData: Partial<InsertOrganizationMember>): Promise<OrganizationMember> {
    if (!memberData.organizationId || !memberData.userId) {
      throw new Error("Organization ID and User ID are required");
    }
    
    const [member] = await db
      .insert(organizationMembers)
      .values({
        organizationId: memberData.organizationId,
        userId: memberData.userId,
        role: memberData.role || "member",
        inviteStatus: memberData.inviteStatus || "accepted",
        inviteToken: memberData.inviteToken || null,
        inviteExpiry: memberData.inviteExpiry || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return member;
  }

  async removeOrganizationMember(id: number): Promise<boolean> {
    const result = await db.delete(organizationMembers).where(eq(organizationMembers.id, id));
    return result.rowCount > 0;
  }
}

// Determine which storage implementation to use based on environment
const useMemStorage = process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL;
export const storage = useMemStorage ? new MemStorage() : new DatabaseStorage();