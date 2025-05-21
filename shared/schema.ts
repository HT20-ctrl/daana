import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // Hashed password for local auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  isVerified: boolean("is_verified").default(false),
  verificationToken: varchar("verification_token"),
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  authProvider: varchar("auth_provider").default("local"), // "local", "replit", "google", etc.
  userSettings: jsonb("user_settings"), // Store user settings as JSON
  organizationId: varchar("organization_id"), // For multi-tenant support
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platforms = pgTable(
  "platforms", 
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    organizationId: varchar("organization_id").references(() => organizations.id),
    name: varchar("name").notNull(), // e.g., "facebook", "instagram", "whatsapp"
    displayName: varchar("display_name").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiry: timestamp("token_expiry"),
    metadata: jsonb("metadata"), // Store platform-specific metadata (instance URLs, org IDs, etc.)
    isConnected: boolean("is_connected").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      // Index for faster queries by userId - most common query
      userIdIdx: index("platforms_user_id_idx").on(table.userId),
      // Index for organization filtering - essential for multi-tenant security
      orgIdIdx: index("platforms_org_id_idx").on(table.organizationId),
      // Compound index for user+organization filtering - optimizes our most common security query
      userOrgIdx: index("platforms_user_org_idx").on(table.userId, table.organizationId),
      // Index for faster platform name lookup
      nameIdx: index("platforms_name_idx").on(table.name),
      // Index for finding connected platforms quickly
      isConnectedIdx: index("platforms_is_connected_idx").on(table.isConnected),
    };
  }
);

export const conversations = pgTable(
  "conversations", 
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    organizationId: varchar("organization_id").references(() => organizations.id),
    platformId: integer("platform_id").references(() => platforms.id),
    customerName: varchar("customer_name").notNull(),
    customerAvatar: varchar("customer_avatar"),
    lastMessage: text("last_message"),
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      // Index for faster queries by userId - most common query pattern
      userIdIdx: index("conversations_user_id_idx").on(table.userId),
      // Index for organization filtering - critical for multi-tenant security
      orgIdIdx: index("conversations_org_id_idx").on(table.organizationId),
      // Compound index for user+organization filtering - optimizes our most common security query
      userOrgIdx: index("conversations_user_org_idx").on(table.userId, table.organizationId),
      // Index for platform filtering - common in dashboard views
      platformIdIdx: index("conversations_platform_id_idx").on(table.platformId),
      // Compound index for finding active conversations for a user
      activeUserIdx: index("conversations_active_user_idx").on(table.userId, table.isActive),
      // Index for sorting by most recent conversations
      lastMessageAtIdx: index("conversations_last_message_at_idx").on(table.lastMessageAt),
    };
  }
);

export const messages = pgTable(
  "messages", 
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
    content: text("content").notNull(),
    isFromCustomer: boolean("is_from_customer").notNull(),
    isAiGenerated: boolean("is_ai_generated").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      // Index for faster lookup of messages by conversation
      conversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
      // Index for timeline sorting
      createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
      // Index for filtering AI-generated responses
      aiGeneratedIdx: index("messages_ai_generated_idx").on(table.isAiGenerated),
    };
  }
);

export const knowledgeBase = pgTable(
  "knowledge_base", 
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    fileName: varchar("file_name").notNull(),
    fileType: varchar("file_type").notNull(), // e.g., "pdf", "docx", "txt"
    fileSize: integer("file_size").notNull(),
    content: text("content"),
    filePath: varchar("file_path"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      // Index for faster queries by userId
      userIdIdx: index("knowledge_base_user_id_idx").on(table.userId),
      // Index for file type filtering
      fileTypeIdx: index("knowledge_base_file_type_idx").on(table.fileType),
      // Index for sorting by most recent files
      updatedAtIdx: index("knowledge_base_updated_at_idx").on(table.updatedAt),
    };
  }
);

export const organizations = pgTable(
  "organizations",
  {
    id: varchar("id").primaryKey().notNull(),
    name: varchar("name").notNull(),
    plan: varchar("plan").default("free"), // free, professional, enterprise
    logo: varchar("logo"),
    website: varchar("website"),
    industry: varchar("industry"),
    size: integer("size"),
    settings: jsonb("settings"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      nameIdx: index("organizations_name_idx").on(table.name),
      planIdx: index("organizations_plan_idx").on(table.plan),
    };
  }
);

export const analytics = pgTable(
  "analytics", 
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    organizationId: varchar("organization_id").references(() => organizations.id),
    totalMessages: integer("total_messages").default(0),
    aiResponses: integer("ai_responses").default(0),
    manualResponses: integer("manual_responses").default(0),
    sentimentScore: integer("sentiment_score").default(0),
    date: timestamp("date").defaultNow(),
  },
  (table) => {
    return {
      // Index for faster queries by userId
      userIdIdx: index("analytics_user_id_idx").on(table.userId),
      // Index for date-based queries (trends, reports)
      dateIdx: index("analytics_date_idx").on(table.date),
      // Compound index for user analytics over time
      userDateIdx: index("analytics_user_date_idx").on(table.userId, table.date),
      // Index for organization analytics
      orgIdIdx: index("analytics_org_id_idx").on(table.organizationId),
    };
  }
);

// Organization members junction table to manage many-to-many relationships
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: serial("id").primaryKey(),
    organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    role: varchar("role").default("member"), // owner, admin, member
    inviteStatus: varchar("invite_status").default("pending"), // pending, accepted, rejected
    inviteToken: varchar("invite_token"),
    inviteExpiry: timestamp("invite_expiry"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      orgUserIdx: index("org_member_org_user_idx").on(table.organizationId, table.userId),
      userIdx: index("org_member_user_idx").on(table.userId),
      orgIdx: index("org_member_org_idx").on(table.organizationId),
      roleIdx: index("org_member_role_idx").on(table.role),
    };
  }
);

// Export types and schemas
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertPlatform = typeof platforms.$inferInsert;
export type Platform = typeof platforms.$inferSelect;

export type InsertConversation = typeof conversations.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = typeof messages.$inferInsert;
export type Message = typeof messages.$inferSelect;

export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;

export type InsertAnalytics = typeof analytics.$inferInsert;
export type Analytics = typeof analytics.$inferSelect;

export type InsertOrganization = typeof organizations.$inferInsert;
export type Organization = typeof organizations.$inferSelect;

export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;

// User settings interfaces
export interface AISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  responseTimeout: number;
  enableKnowledgeBase: boolean;
  fallbackToHuman: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  newMessageAlerts: boolean;
  assignmentNotifications: boolean;
  summaryReports: boolean;
}

export interface UserSettings {
  aiSettings?: AISettings;
  notificationSettings?: NotificationSettings;
  profileSettings?: {
    name?: string;
    role?: string;
    company?: string;
  };
}

// Add type definition for userSettings
export type UserWithSettings = User & {
  userSettings: UserSettings;
};

// Create insert schemas
export const insertPlatformSchema = createInsertSchema(platforms).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({ id: true });
export const insertAnalyticsSchema = createInsertSchema(analytics).omit({ id: true });
