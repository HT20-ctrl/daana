/**
 * Performance optimizations for database queries
 * This module provides optimized query helpers that leverage our database indexes
 */
import { db, executeWithTimeout } from "./dbConfig";
import { eq, and, desc, lte, gte, sql, isNull, isNotNull } from "drizzle-orm";
import {
  users,
  platforms,
  conversations,
  messages,
  knowledgeBase,
  analytics
} from "../shared/schema";

/**
 * Optimized query functions for platforms
 */
export const platformQueries = {
  // Get platforms for a user (uses user_id index)
  getByUserId: (userId: string) => 
    db.select().from(platforms).where(eq(platforms.userId, userId)),
  
  // Get connected platforms for a user (uses compound index)
  getConnectedByUserId: (userId: string) => 
    db.select().from(platforms).where(
      and(
        eq(platforms.userId, userId),
        eq(platforms.isConnected, true)
      )
    ),
    
  // Get platform by type (uses name index)
  getByType: (userId: string, platformType: string) => 
    db.select().from(platforms).where(
      and(
        eq(platforms.userId, userId),
        eq(platforms.name, platformType)
      )
    )
};

/**
 * Optimized query functions for conversations
 */
export const conversationQueries = {
  // Get recent conversations (uses lastMessageAt index)
  getRecent: (userId: string, limit: number = 5) => 
    db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit),

  // Get active conversations (uses active_user compound index)
  getActive: (userId: string) => 
    db.select().from(conversations).where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.isActive, true)
      )
    ),
    
  // Get conversations by platform (uses platform_id index)
  getByPlatform: (userId: string, platformId: number) => 
    db.select().from(conversations).where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.platformId, platformId)
      )
    )
};

/**
 * Optimized query functions for messages
 */
export const messageQueries = {
  // Get messages for a conversation (uses conversation_id index)
  getByConversation: (conversationId: number, limit: number = 50) => 
    db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit),
      
  // Get AI-generated messages (uses isAiGenerated index)
  getAiGenerated: (conversationId: number) => 
    db.select().from(messages).where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.isAiGenerated, true)
      )
    )
};

/**
 * Optimized query functions for knowledge base
 */
export const knowledgeBaseQueries = {
  // Get knowledge base items by user (uses user_id index)
  getByUserId: (userId: string) => 
    db.select().from(knowledgeBase)
      .where(eq(knowledgeBase.userId, userId))
      .orderBy(desc(knowledgeBase.updatedAt)),
      
  // Get knowledge base items by file type (uses file_type index)
  getByFileType: (userId: string, fileType: string) => 
    db.select().from(knowledgeBase).where(
      and(
        eq(knowledgeBase.userId, userId),
        eq(knowledgeBase.fileType, fileType)
      )
    )
};

/**
 * Optimized query functions for analytics
 */
export const analyticsQueries = {
  // Get analytics by date range (uses user_date compound index)
  getByDateRange: (userId: string, startDate: Date, endDate: Date) => 
    db.select().from(analytics).where(
      and(
        eq(analytics.userId, userId),
        gte(analytics.date, startDate),
        lte(analytics.date, endDate)
      )
    ),
    
  // Get latest analytics (uses date index)
  getLatest: (userId: string) => 
    db.select().from(analytics)
      .where(eq(analytics.userId, userId))
      .orderBy(desc(analytics.date))
      .limit(1)
};

/**
 * Performance optimization for counting records
 * Traditional count(*) can be slow on large tables
 */
export const optimizedCount = {
  // Faster message count using the indexed conversation_id
  messageCountByConversation: async (conversationId: number): Promise<number> => {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM ${messages._.name} 
          WHERE ${messages.conversationId.name} = ${conversationId}`
    );
    return Number(result[0]?.count || 0);
  },
  
  // Faster conversation count using the indexed userId
  conversationCountByUser: async (userId: string): Promise<number> => {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM ${conversations._.name} 
          WHERE ${conversations.userId.name} = ${userId}`
    );
    return Number(result[0]?.count || 0);
  }
};