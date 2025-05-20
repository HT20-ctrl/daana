import { z } from 'zod';
import { insertPlatformSchema, insertConversationSchema, insertMessageSchema, insertKnowledgeBaseSchema } from '@shared/schema';

// Platform validation schemas with extended validation
export const platformValidationSchema = insertPlatformSchema.extend({
  name: z.string().min(2, 'Platform name must be at least 2 characters').max(50, 'Platform name cannot exceed 50 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50, 'Display name cannot exceed 50 characters')
});

// Conversation validation schema with extended validation
export const conversationValidationSchema = insertConversationSchema.extend({
  customerName: z.string().min(1, 'Customer name is required').max(100, 'Customer name cannot exceed 100 characters'),
  customerEmail: z.string().email('Invalid email format').optional().nullable()
});

// Message validation schema with extended validation
export const messageValidationSchema = insertMessageSchema.extend({
  content: z.string().min(1, 'Message content is required').max(5000, 'Message content cannot exceed 5000 characters')
});

// Knowledge base item validation schema with extended validation
export const knowledgeBaseValidationSchema = insertKnowledgeBaseSchema.extend({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name cannot exceed 255 characters'),
  fileSize: z.number().min(1, 'File size must be greater than 0'),
  content: z.string().min(1, 'Content is required')
});

// Settings validation schemas
export const aiSettingsValidationSchema = z.object({
  model: z.string().min(1, 'Model name is required'),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(1).max(8192),
  responseTimeout: z.number().min(1000),
  enableKnowledgeBase: z.boolean(),
  fallbackToHuman: z.boolean()
});

export const notificationSettingsValidationSchema = z.object({
  emailNotifications: z.boolean(),
  desktopNotifications: z.boolean(),
  newMessageAlerts: z.boolean(),
  assignmentNotifications: z.boolean(),
  summaryReports: z.boolean()
});

export const profileSettingsValidationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters').optional(),
  role: z.string().max(100, 'Role cannot exceed 100 characters').optional(),
  company: z.string().max(100, 'Company name cannot exceed 100 characters').optional()
});

export const userSettingsValidationSchema = z.object({
  aiSettings: aiSettingsValidationSchema.optional(),
  notificationSettings: notificationSettingsValidationSchema.optional(),
  profileSettings: profileSettingsValidationSchema.optional()
});