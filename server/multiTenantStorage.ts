/**
 * Multi-Tenant Storage Enhancements
 * 
 * This module extends the core storage implementation with multi-tenant
 * data isolation capabilities, ensuring that organization data is properly
 * segmented in all operations.
 */

import { 
  platforms, 
  conversations, 
  messages, 
  analytics, 
  knowledgeBase,
  type Platform, 
  type InsertPlatform,
  type Conversation, 
  type InsertConversation,
  type Message, 
  type InsertMessage,
  type KnowledgeBase, 
  type InsertKnowledgeBase,
  type Analytics, 
  type InsertAnalytics
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Enhanced platform queries with multi-tenant security
 * All operations filter by organizationId to ensure proper data isolation
 */
export const platformQueries = {
  // Get all platforms for a user within a specific organization
  getByUserAndOrg: async (userId: string, organizationId: string): Promise<Platform[]> => {
    return db
      .select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.organizationId, organizationId)
        )
      )
      .orderBy(desc(platforms.updatedAt));
  },

  // Get a specific platform, ensuring it belongs to the correct organization
  getByIdWithOrgCheck: async (id: number, organizationId: string): Promise<Platform | undefined> => {
    const [platform] = await db
      .select()
      .from(platforms)
      .where(
        and(
          eq(platforms.id, id),
          eq(platforms.organizationId, organizationId)
        )
      );
    return platform;
  },

  // Create a new platform with organization context
  createWithOrgContext: async (platformData: InsertPlatform & { organizationId: string }): Promise<Platform> => {
    const [newPlatform] = await db
      .insert(platforms)
      .values(platformData)
      .returning();
    return newPlatform;
  },

  // Update a platform with organization security check
  updateWithOrgCheck: async (
    id: number, 
    organizationId: string, 
    data: Partial<InsertPlatform>
  ): Promise<Platform> => {
    // First verify the platform belongs to this organization
    const existing = await platformQueries.getByIdWithOrgCheck(id, organizationId);
    if (!existing) {
      throw new Error(`Platform with ID ${id} not found in organization ${organizationId}`);
    }

    const [updated] = await db
      .update(platforms)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(platforms.id, id),
          eq(platforms.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  },

  // Delete a platform with organization security check
  deleteWithOrgCheck: async (id: number, organizationId: string): Promise<boolean> => {
    const result = await db
      .delete(platforms)
      .where(
        and(
          eq(platforms.id, id),
          eq(platforms.organizationId, organizationId)
        )
      );
    return result.rowCount > 0;
  }
};

/**
 * Enhanced conversation queries with multi-tenant security
 * All operations filter by organizationId to ensure proper data isolation
 */
export const conversationQueries = {
  // Get all conversations for a user within a specific organization
  getByUserAndOrg: async (userId: string, organizationId: string): Promise<Conversation[]> => {
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
  },

  // Get a specific conversation, ensuring it belongs to the correct organization
  getByIdWithOrgCheck: async (id: number, organizationId: string): Promise<Conversation | undefined> => {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.organizationId, organizationId)
        )
      );
    return conversation;
  },

  // Create a new conversation with organization context
  createWithOrgContext: async (conversationData: InsertConversation & { organizationId: string }): Promise<Conversation> => {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversationData)
      .returning();
    return newConversation;
  }
};

/**
 * Enhanced knowledge base queries with multi-tenant security
 * All operations filter by organizationId to ensure proper data isolation
 */
export const knowledgeBaseQueries = {
  // Get all knowledge base items for a user within a specific organization
  getByUserAndOrg: async (userId: string, organizationId: string): Promise<KnowledgeBase[]> => {
    return db
      .select()
      .from(knowledgeBase)
      .where(
        and(
          eq(knowledgeBase.userId, userId),
          eq(knowledgeBase.organizationId, organizationId)
        )
      )
      .orderBy(desc(knowledgeBase.updatedAt));
  },

  // Get a specific knowledge base item, ensuring it belongs to the correct organization
  getByIdWithOrgCheck: async (id: number, organizationId: string): Promise<KnowledgeBase | undefined> => {
    const [item] = await db
      .select()
      .from(knowledgeBase)
      .where(
        and(
          eq(knowledgeBase.id, id),
          eq(knowledgeBase.organizationId, organizationId)
        )
      );
    return item;
  },

  // Create a new knowledge base item with organization context
  createWithOrgContext: async (itemData: InsertKnowledgeBase & { organizationId: string }): Promise<KnowledgeBase> => {
    const [newItem] = await db
      .insert(knowledgeBase)
      .values(itemData)
      .returning();
    return newItem;
  },

  // Delete a knowledge base item with organization security check
  deleteWithOrgCheck: async (id: number, organizationId: string): Promise<boolean> => {
    const result = await db
      .delete(knowledgeBase)
      .where(
        and(
          eq(knowledgeBase.id, id),
          eq(knowledgeBase.organizationId, organizationId)
        )
      );
    return result.rowCount > 0;
  }
};

/**
 * Enhanced analytics queries with multi-tenant security
 * All operations filter by organizationId to ensure proper data isolation
 */
export const analyticsQueries = {
  // Get analytics for a user within a specific organization
  getByUserAndOrg: async (userId: string, organizationId: string): Promise<Analytics | undefined> => {
    const [record] = await db
      .select()
      .from(analytics)
      .where(
        and(
          eq(analytics.userId, userId),
          eq(analytics.organizationId, organizationId)
        )
      )
      .orderBy(desc(analytics.date))
      .limit(1);
    return record;
  },

  // Get analytics for an organization within a date range
  getByOrgAndDateRange: async (
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Analytics[]> => {
    return db
      .select()
      .from(analytics)
      .where(
        and(
          eq(analytics.organizationId, organizationId),
          sql`${analytics.date} >= ${startDate}`,
          sql`${analytics.date} <= ${endDate}`
        )
      )
      .orderBy(analytics.date);
  },

  // Create analytics record with organization context
  createWithOrgContext: async (analyticsData: InsertAnalytics & { organizationId: string }): Promise<Analytics> => {
    const [record] = await db
      .insert(analytics)
      .values(analyticsData)
      .returning();
    return record;
  },

  // Update analytics record with organization security check
  updateWithOrgCheck: async (id: number, organizationId: string, data: Partial<InsertAnalytics>): Promise<Analytics> => {
    const [updated] = await db
      .update(analytics)
      .set(data)
      .where(
        and(
          eq(analytics.id, id),
          eq(analytics.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
};