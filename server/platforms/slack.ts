import { Request, Response } from "express";
import crypto from "crypto";
import { WebClient } from "@slack/web-api";
import { storage } from "../storage";
import { ConversationType, InsertConversation, InsertMessage, platforms } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

// Check if Slack API credentials are configured
export function isSlackConfigured(): boolean {
  return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID);
}

// Get Slack platform status
export async function getSlackStatus(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  
  try {
    // Check if platform is already connected for this user
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        eq(platforms.userId, userId) && 
        eq(platforms.name, "slack")
      );
    
    res.json({ 
      configured: isSlackConfigured(),
      connected: !!platformRecord?.isConnected
    });
  } catch (error) {
    console.error("Error getting Slack status:", error);
    res.json({ 
      configured: isSlackConfigured(),
      connected: false 
    });
  }
}

// Connect to Slack API
export async function connectSlack(req: Request, res: Response) {
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured. Please add SLACK_BOT_TOKEN and SLACK_CHANNEL_ID to your environment variables." 
    });
  }

  try {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    if (req.session) {
      req.session.slackState = state;
    }

    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test connection by getting info about the bot
    const botInfo = await slack.auth.test();
    
    if (!botInfo.ok) {
      throw new Error("Slack API token validation failed");
    }

    // Get user ID from authenticated user
    const userId = req.user?.id || "1";
    
    // Check if platform already exists for this user
    const [existingPlatform] = await db.select()
      .from(platforms)
      .where(
        eq(platforms.userId, userId) && 
        eq(platforms.name, "slack")
      );
    
    if (existingPlatform) {
      // Update existing platform
      await db.update(platforms)
        .set({
          accessToken: process.env.SLACK_BOT_TOKEN,
          isConnected: true,
          updatedAt: new Date()
        })
        .where(eq(platforms.id, existingPlatform.id));
    } else {
      // Create new platform
      await storage.createPlatform({
        name: "slack",
        displayName: `Slack (${botInfo.team})`,
        userId: userId,
        accessToken: process.env.SLACK_BOT_TOKEN,
        refreshToken: null,
        tokenExpiry: null, // Bot tokens don't expire
        isConnected: true
      });
    }
    
    // Redirect back to the app with success parameter
    return res.redirect(`/?slack_connected=true`);
  } catch (error) {
    console.error("Error connecting to Slack:", error);
    return res.status(500).json({ message: "Failed to connect to Slack" });
  }
}

// Get Slack channels
export async function getSlackChannels(req: Request, res: Response) {
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured"
    });
  }

  try {
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Get public channels list
    const result = await slack.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true
    });
    
    if (!result.ok) {
      throw new Error("Failed to fetch channels from Slack");
    }
    
    // Transform channels to our format
    const channels = result.channels?.map((channel: any) => {
      return {
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        memberCount: channel.num_members,
        isGeneral: channel.is_general
      };
    }) || [];
    
    res.json(channels);
  } catch (error) {
    console.error("Error getting Slack channels:", error);
    res.status(500).json({ message: "Failed to fetch Slack channels" });
  }
}

// Get Slack members
export async function getSlackMembers(req: Request, res: Response) {
  const { channel } = req.query;
  
  if (!channel) {
    return res.status(400).json({ message: "Channel ID is required" });
  }
  
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured"
    });
  }

  try {
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Get channel members
    const memberIds = await slack.conversations.members({
      channel: channel as string
    });
    
    if (!memberIds.ok || !memberIds.members) {
      throw new Error("Failed to fetch channel members from Slack");
    }
    
    // Get user info for each member
    const members = await Promise.all(
      memberIds.members.map(async (userId: string) => {
        try {
          const userInfo = await slack.users.info({ user: userId });
          if (userInfo.ok && userInfo.user) {
            return {
              id: userInfo.user.id,
              name: userInfo.user.real_name || userInfo.user.name,
              displayName: userInfo.user.profile?.display_name || userInfo.user.name,
              avatar: userInfo.user.profile?.image_72,
              isBot: userInfo.user.is_bot
            };
          }
          return null;
        } catch {
          return null;
        }
      })
    );
    
    // Filter out null values (failed user info requests)
    res.json(members.filter(Boolean));
  } catch (error) {
    console.error("Error getting Slack members:", error);
    res.status(500).json({ message: "Failed to fetch Slack members" });
  }
}

// Get Slack messages
export async function getSlackMessages(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { channel, limit = 50, cursor } = req.query;
  
  const channelId = channel || process.env.SLACK_CHANNEL_ID;
  
  if (!channelId) {
    return res.status(400).json({ message: "Channel ID is required" });
  }
  
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured"
    });
  }

  try {
    // Get platform from DB
    const [platformRecord] = await db.select()
      .from(platforms)
      .where(
        eq(platforms.userId, userId) && 
        eq(platforms.name, "slack")
      );
    
    if (!platformRecord) {
      return res.status(404).json({ message: "Slack platform not found for this user" });
    }
    
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Get messages from the channel
    const result = await slack.conversations.history({
      channel: channelId as string,
      limit: Number(limit),
      cursor: cursor as string || undefined
    });
    
    if (!result.ok) {
      throw new Error("Failed to fetch messages from Slack");
    }
    
    // Get conversation or create one if it doesn't exist
    let conversation = await storage.getConversationByExternalId(channelId as string);
    
    if (!conversation) {
      // Get channel info
      const channelInfo = await slack.conversations.info({
        channel: channelId as string
      });
      
      if (!channelInfo.ok) {
        throw new Error("Failed to fetch channel information");
      }
      
      // Create new conversation
      const newConversation: InsertConversation = {
        userId,
        platformId: platformRecord.id,
        customerName: channelInfo.channel.name,
        customerAvatar: null,
        lastMessage: "New conversation",
        lastMessageAt: new Date(),
        isActive: true,
        externalId: channelId as string,
        conversationType: ConversationType.Channel
      };
      
      conversation = await storage.createConversation(newConversation);
    }
    
    // Transform Slack messages to our format and store them
    const messagesData = await Promise.all(result.messages?.map(async (msg: any) => {
      // Get user info if available
      let userName = msg.user || "Unknown";
      let userAvatar = null;
      
      if (msg.user) {
        try {
          const userInfo = await slack.users.info({ user: msg.user });
          if (userInfo.ok && userInfo.user) {
            userName = userInfo.user.real_name || userInfo.user.name;
            userAvatar = userInfo.user.profile?.image_72;
          }
        } catch (error) {
          console.warn(`Could not fetch user info for ${msg.user}`, error);
        }
      }
      
      // Check if message exists in our database
      const isBot = msg.bot_id != null;
      
      // Create message in our database if it doesn't exist
      const messageData: InsertMessage = {
        conversationId: conversation!.id,
        content: msg.text,
        isFromCustomer: !isBot,
        isAiGenerated: false,
        externalId: msg.ts,
        createdAt: new Date(parseInt(msg.ts.split('.')[0]) * 1000)
      };
      
      // Store the message
      const storedMessage = await storage.createMessageIfNotExists(messageData);
      
      return {
        id: storedMessage.id,
        externalId: msg.ts,
        senderId: msg.user || msg.bot_id,
        senderName: userName,
        senderAvatar: userAvatar,
        content: msg.text,
        timestamp: new Date(parseInt(msg.ts.split('.')[0]) * 1000),
        isFromCustomer: !isBot,
        attachments: msg.files || [],
        reactions: msg.reactions || []
      };
    }) || []);
    
    // Update conversation with last message
    if (messagesData.length > 0) {
      const latestMessage = messagesData[0]; // Slack returns messages in reverse chronological order
      
      await storage.updateConversation(conversation.id, {
        lastMessage: latestMessage.content.substring(0, 100),
        lastMessageAt: latestMessage.timestamp
      });
    }
    
    res.json({
      messages: messagesData,
      nextCursor: result.response_metadata?.next_cursor,
      hasMore: !!result.response_metadata?.next_cursor,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error("Error getting Slack messages:", error);
    res.status(500).json({ message: "Failed to fetch Slack messages" });
  }
}

// Send Slack message
export async function sendSlackMessage(req: Request, res: Response) {
  const userId = req.user?.id || "1";
  const { message, conversationId, channel } = req.body;
  
  if (!message) {
    return res.status(400).json({ message: "Message text is required" });
  }
  
  if (!conversationId && !channel) {
    return res.status(400).json({ message: "Either conversationId or channel is required" });
  }
  
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured"
    });
  }
  
  try {
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Get channel ID either from the request or from the conversation
    let channelId: string;
    let conversation;
    
    if (conversationId) {
      conversation = await storage.getConversationById(Number(conversationId));
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      channelId = conversation.externalId || process.env.SLACK_CHANNEL_ID!;
    } else {
      channelId = channel;
      
      // Get platform from DB
      const [platformRecord] = await db.select()
        .from(platforms)
        .where(
          eq(platforms.userId, userId) && 
          eq(platforms.name, "slack")
        );
      
      if (!platformRecord) {
        return res.status(404).json({ message: "Slack platform not found for this user" });
      }
      
      // Look up conversation by externalId
      conversation = await storage.getConversationByExternalId(channelId);
      
      if (!conversation) {
        // Get channel info
        const channelInfo = await slack.conversations.info({
          channel: channelId
        });
        
        if (!channelInfo.ok) {
          throw new Error("Failed to fetch channel information");
        }
        
        // Create new conversation
        const newConversation: InsertConversation = {
          userId,
          platformId: platformRecord.id,
          customerName: channelInfo.channel.name,
          customerAvatar: null,
          lastMessage: message.substring(0, 100),
          lastMessageAt: new Date(),
          isActive: true,
          externalId: channelId,
          conversationType: ConversationType.Channel
        };
        
        conversation = await storage.createConversation(newConversation);
      }
    }
    
    // Send message to Slack
    const result = await slack.chat.postMessage({
      channel: channelId,
      text: message,
      as_user: true
    });
    
    if (!result.ok) {
      throw new Error("Failed to send message to Slack");
    }
    
    // Store message in our database
    const messageData: InsertMessage = {
      conversationId: conversation.id,
      content: message,
      isFromCustomer: false,
      isAiGenerated: false,
      externalId: result.ts,
      createdAt: new Date()
    };
    
    const storedMessage = await storage.createMessage(messageData);
    
    // Update conversation with latest message
    await storage.updateConversation(conversation.id, {
      lastMessage: message.substring(0, 100),
      lastMessageAt: new Date()
    });
    
    res.json({ 
      success: true, 
      message: "Message sent successfully",
      messageId: storedMessage.id,
      externalMessageId: result.ts,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error("Error sending Slack message:", error);
    res.status(500).json({ message: "Failed to send Slack message" });
  }
}