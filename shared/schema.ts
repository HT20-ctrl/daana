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
  pgEnum
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
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform configuration and connection
export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(), // e.g., "facebook", "instagram", "slack", "whatsapp"
  displayName: varchar("display_name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isConnected: boolean("is_connected").default(false),
  settings: jsonb("settings"), // Platform-specific settings
  metadata: jsonb("metadata"), // Additional metadata about the platform
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enum for conversation types
export const conversationTypeEnum = pgEnum("conversation_type", [
  "direct", // Direct message with a customer
  "group", // Group conversation
  "channel", // Channel in a platform like Slack
  "support", // Support ticket
  "sales", // Sales inquiry
]);

// Define conversation status
export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "pending",
  "closed",
  "archived",
]);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  platformId: integer("platform_id").references(() => platforms.id),
  customerName: varchar("customer_name").notNull(),
  customerAvatar: varchar("customer_avatar"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  status: conversationStatusEnum("status").default("active"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  externalId: varchar("external_id"), // ID of conversation in external platform
  conversationType: conversationTypeEnum("conversation_type").default("direct"),
  metadata: jsonb("metadata"), // Platform-specific metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message status tracking
export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "delivered",
  "read",
  "failed",
  "pending",
]);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  isFromCustomer: boolean("is_from_customer").notNull(),
  isAiGenerated: boolean("is_ai_generated").default(false),
  status: messageStatusEnum("status").default("sent"),
  externalId: varchar("external_id"), // ID of message in external platform
  sentiment: integer("sentiment"), // Sentiment score from -10 to 10
  attachments: jsonb("attachments"), // Array of file/media attachments
  metadata: jsonb("metadata"), // Platform-specific metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document categories
export const knowledgeBaseCategoryEnum = pgEnum("knowledge_base_category", [
  "policies",
  "procedures",
  "products",
  "services",
  "faqs",
  "troubleshooting",
  "other",
]);

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(), // e.g., "pdf", "docx", "txt"
  fileSize: integer("file_size").notNull(),
  filePath: varchar("file_path"), // Path to file in storage
  title: varchar("title"), // Document title
  description: text("description"), // Document description
  category: knowledgeBaseCategoryEnum("category").default("other"),
  content: text("content"), // Extracted text content
  keywords: text("keywords").array(), // Keywords for improved search
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  totalMessages: integer("total_messages").default(0),
  aiResponses: integer("ai_responses").default(0),
  manualResponses: integer("manual_responses").default(0),
  sentimentScore: integer("sentiment_score").default(0),
  responseTime: integer("response_time"), // Average response time in seconds
  resolvedConversations: integer("resolved_conversations").default(0),
  escalatedConversations: integer("escalated_conversations").default(0),
  platformBreakdown: jsonb("platform_breakdown"), // Message counts by platform
  date: timestamp("date").defaultNow(),
});

// Export enum types
export enum ConversationType {
  Direct = "direct",
  Group = "group", 
  Channel = "channel",
  Support = "support",
  Sales = "sales"
}

export enum ConversationStatus {
  Active = "active",
  Pending = "pending",
  Closed = "closed",
  Archived = "archived"
}

export enum MessageStatus {
  Sent = "sent",
  Delivered = "delivered",
  Read = "read",
  Failed = "failed",
  Pending = "pending"
}

export enum KnowledgeBaseCategory {
  Policies = "policies",
  Procedures = "procedures",
  Products = "products",
  Services = "services",
  FAQs = "faqs",
  Troubleshooting = "troubleshooting",
  Other = "other"
}

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

// Create insert schemas
export const insertPlatformSchema = createInsertSchema(platforms).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({ id: true });
export const insertAnalyticsSchema = createInsertSchema(analytics).omit({ id: true });
