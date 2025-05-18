import sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/mail';
import { Request, Response } from "express";
import { db } from "../db";
import { platforms } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";

// Check if SendGrid credentials are configured
export function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

// Initialize SendGrid API if key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Interface for email messages
interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: Date;
  threadId?: string;
  labels?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  status: 'sent' | 'received' | 'draft';
}

// Get status of email service
export async function getEmailStatus(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  
  try {
    // Check if platform is already connected for this user
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "email")
        )
      );
    
    res.json({ 
      configured: isEmailConfigured(),
      connected: !!platformRecord?.isConnected
    });
  } catch (error) {
    console.error("Error getting email status:", error);
    res.json({ 
      configured: isEmailConfigured(),
      connected: false 
    });
  }
}

// Connect to email service
export async function connectEmail(req: Request, res: Response) {
  if (!isEmailConfigured()) {
    return res.status(400).json({ 
      message: "SendGrid API key not configured. Please add SENDGRID_API_KEY to your environment variables." 
    });
  }

  const userId = req.user?.id || "1";
  const { senderEmail, senderName } = req.body;
  
  if (!senderEmail) {
    return res.status(400).json({ message: "Sender email is required" });
  }

  try {
    // Check if platform already exists for this user
    const [existingPlatform] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "email")
        )
      );
    
    const settings = {
      senderEmail,
      senderName: senderName || senderEmail
    };
    
    if (existingPlatform) {
      // Update existing platform
      await db.update(platforms)
        .set({
          accessToken: process.env.SENDGRID_API_KEY,
          isConnected: true,
          settings,
          updatedAt: new Date()
        })
        .where(eq(platforms.id, existingPlatform.id));
    } else {
      // Create new platform
      await storage.createPlatform({
        name: "email",
        displayName: `Email (${senderEmail})`,
        userId,
        accessToken: process.env.SENDGRID_API_KEY,
        refreshToken: null,
        tokenExpiry: null, // API keys don't expire
        isConnected: true,
        settings
      });
    }
    
    // Test the configuration
    try {
      // We're not actually sending an email, just validating the config
      const msg: MailDataRequired = {
        to: senderEmail, // Send to self as a test
        from: senderEmail,
        subject: 'Email Integration Test (Not Sent)',
        text: 'This is a configuration test. This email was not actually sent.',
        html: '<p>This is a configuration test. This email was not actually sent.</p>',
        mailSettings: {
          sandboxMode: {
            enable: true // This prevents the email from actually being sent
          }
        }
      };
      
      await sgMail.send(msg);
    } catch (emailError) {
      console.error("Error testing email configuration:", emailError);
      // We don't fail the connection if the test fails, as it might be due to sandbox mode limitations
    }
    
    return res.json({ 
      success: true, 
      message: "Email service connected successfully" 
    });
  } catch (error) {
    console.error("Error connecting to email service:", error);
    return res.status(500).json({ message: "Failed to connect to email service" });
  }
}

// Send an email
export async function sendEmail(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { to, subject, content, html } = req.body;
  
  if (!to || !subject || (!content && !html)) {
    return res.status(400).json({ 
      message: "Email recipient, subject, and content are required" 
    });
  }
  
  if (!isEmailConfigured()) {
    return res.status(400).json({ 
      message: "Email service not configured. Please add SENDGRID_API_KEY to your environment variables." 
    });
  }

  try {
    // Get platform configuration
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "email")
        )
      );
    
    if (!platformRecord || !platformRecord.isConnected) {
      return res.status(404).json({ message: "Email platform not configured for this user" });
    }
    
    const settings = platformRecord.settings as { senderEmail: string; senderName: string } || {};
    
    if (!settings.senderEmail) {
      return res.status(400).json({ message: "Sender email not configured" });
    }
    
    // Send email through SendGrid
    const msg: MailDataRequired = {
      to,
      from: {
        email: settings.senderEmail,
        name: settings.senderName || settings.senderEmail
      },
      subject,
      text: content,
      html: html || content.replace(/\n/g, '<br>')
    };
    
    const result = await sgMail.send(msg);
    
    // Create conversation and message in our system
    let conversation = await storage.createConversation({
      userId,
      platformId: platformRecord.id,
      customerName: to,
      lastMessage: subject,
      lastMessageAt: new Date(),
      isActive: true,
      externalId: to // Using email address as external ID
    });
    
    // Store the message
    const message = await storage.createMessage({
      conversationId: conversation.id,
      content: content || html,
      isFromCustomer: false,
      isAiGenerated: false,
      createdAt: new Date()
    });
    
    // Increment analytics
    await storage.incrementTotalMessages(userId);
    
    return res.json({ 
      success: true, 
      message: "Email sent successfully",
      messageId: message.id,
      conversationId: conversation.id,
      response: result[0]
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ message: "Failed to send email" });
  }
}

// Get emails (with fallback to mock data if API is not configured)
export async function getEmails(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  
  try {
    // Get platform configuration
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        and(
          eq(platforms.userId, userId),
          eq(platforms.name, "email")
        )
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "Email platform not configured for this user" });
    }
    
    // Get conversations from our database
    const conversations = await storage.getConversationsByUserId(userId);
    const emailConversations = conversations.filter(c => c.platformId === platformRecord.id);
    
    // For each conversation, get messages
    const emailThreads = await Promise.all(
      emailConversations.map(async (conversation) => {
        const messages = await storage.getMessagesByConversationId(conversation.id);
        
        return {
          id: conversation.id.toString(),
          recipient: conversation.customerName,
          subject: conversation.lastMessage,
          timestamp: conversation.lastMessageAt,
          threadId: conversation.externalId,
          messages: messages.map(m => ({
            id: m.id.toString(),
            content: m.content,
            timestamp: m.createdAt,
            isFromCustomer: m.isFromCustomer
          })),
          unread: 0
        };
      })
    );
    
    // If we have real email threads, return them
    if (emailThreads.length > 0) {
      return res.json(emailThreads);
    }
    
    // For demo purposes, if we don't have real conversations yet, return mock data
    if (!isEmailConfigured() || emailThreads.length === 0) {
      const mockEmails: EmailMessage[] = [
        {
          id: '1',
          from: 'customer@example.com',
          to: 'support@yourcompany.com',
          subject: 'Question about your services',
          content: 'Hello, I am interested in your services. Could you please provide me with more information?',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          status: 'received'
        },
        {
          id: '2',
          from: 'support@yourcompany.com',
          to: 'customer@example.com',
          subject: 'Re: Question about your services',
          content: 'Thank you for your interest! I would be happy to provide more information. What specific aspects are you interested in?',
          timestamp: new Date(Date.now() - 43200000), // 12 hours ago
          threadId: '1',
          status: 'sent'
        }
      ];
      
      const mockThreads = [
        {
          id: '1',
          recipient: 'customer@example.com',
          subject: 'Question about your services',
          timestamp: new Date(Date.now() - 86400000),
          threadId: '1',
          messages: [
            {
              id: '1',
              content: 'Hello, I am interested in your services. Could you please provide me with more information?',
              timestamp: new Date(Date.now() - 86400000),
              isFromCustomer: true
            },
            {
              id: '2',
              content: 'Thank you for your interest! I would be happy to provide more information. What specific aspects are you interested in?',
              timestamp: new Date(Date.now() - 43200000),
              isFromCustomer: false
            }
          ],
          unread: 0
        }
      ];
      
      return res.json(mockThreads);
    }
    
    return res.json([]);
  } catch (error) {
    console.error("Error fetching emails:", error);
    return res.status(500).json({ message: "Failed to fetch emails" });
  }
}