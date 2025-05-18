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

export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(), // e.g., "facebook", "instagram", "whatsapp"
  displayName: varchar("display_name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isConnected: boolean("is_connected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  platformId: integer("platform_id").references(() => platforms.id),
  customerName: varchar("customer_name").notNull(),
  customerAvatar: varchar("customer_avatar"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  isFromCustomer: boolean("is_from_customer").notNull(),
  isAiGenerated: boolean("is_ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(), // e.g., "pdf", "docx", "txt"
  fileSize: integer("file_size").notNull(),
  content: text("content"),
  filePath: varchar("file_path"),
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
  date: timestamp("date").defaultNow(),
});

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
