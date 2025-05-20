import { Request, Response } from "express";
import crypto from "crypto";
import { WebClient } from "@slack/web-api";
import { storage } from "../storage";

// Check if Slack API credentials are configured
export function isSlackConfigured(): boolean {
  return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID);
}

// Get Slack platform status
export async function getSlackStatus(req: Request, res: Response) {
  try {
    // Check if Slack is configured
    const configured = isSlackConfigured();

    // If Slack is configured, also check if it's already connected for this user
    if (configured) {
      const userId = (req.user as any)?.claims?.sub || "1"; // Use demo user ID if not authenticated
      const platforms = await storage.getPlatformsByUserId(userId);
      const slackPlatform = platforms.find(p => p.name === "slack");
      
      return res.json({ 
        configured: true, 
        connected: !!slackPlatform?.isConnected,
        platformId: slackPlatform?.id,
        displayName: slackPlatform?.displayName || "Slack"
      });
    }
    
    res.json({ configured, connected: false });
  } catch (error) {
    console.error("Error checking Slack status:", error);
    res.status(500).json({ message: "Failed to check Slack status" });
  }
}

// Connect to Slack API using OAuth
export async function connectSlack(req: Request, res: Response) {
  try {
    if (!isSlackConfigured()) {
      return res.status(400).json({ 
        message: "Slack API credentials not configured. Please add SLACK_BOT_TOKEN and SLACK_CHANNEL_ID to your environment variables." 
      });
    }
    
    console.log("Starting Slack API connection");
    
    // Get user ID from the session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // We're using a bot token approach since it's already authenticated
    // In a production app, this would use the full OAuth flow with client ID/secret
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test connection by getting info about the bot
    console.log("Testing Slack connection with bot token");
    const botInfo = await slack.auth.test();
    
    if (!botInfo.ok) {
      throw new Error("Slack API token validation failed");
    }
    
    console.log(`Successfully connected to Slack workspace: ${botInfo.team}`);
    
    // Check if this Slack account is already connected
    const platforms = await storage.getPlatformsByUserId(userId);
    const existingSlack = platforms.find(p => p.name === "slack");
    
    if (existingSlack) {
      // Update existing platform connection
      console.log(`Updating existing Slack platform ID: ${existingSlack.id}`);
      await storage.updatePlatform(existingSlack.id, {
        displayName: `Slack (${botInfo.team})`,
        accessToken: process.env.SLACK_BOT_TOKEN as string,
        isConnected: true
      });
    } else {
      // Create new Slack platform in database
      console.log("Creating new Slack platform connection");
      await storage.createPlatform({
        name: "slack",
        displayName: `Slack (${botInfo.team})`,
        userId: userId,
        accessToken: process.env.SLACK_BOT_TOKEN as string,
        refreshToken: null,
        tokenExpiry: null, // Bot tokens don't expire
        isConnected: true
      });
    }
    
    // Redirect back to the settings page with success parameter
    console.log("Slack connection successful, redirecting to settings");
    res.redirect(`/app/settings?platform=slack&status=connected&workspace=${encodeURIComponent(botInfo.team as string)}`);
  } catch (error) {
    console.error("Error connecting to Slack:", error);
    let errorMessage = "Failed to connect to Slack";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.redirect(`/app/settings?platform=slack&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

// Get Slack messages
export async function getSlackMessages(req: Request, res: Response) {
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured"
    });
  }

  try {
    // Get platform ID from the request
    const platformId = req.params.platformId ? parseInt(req.params.platformId) : undefined;
    
    // Get user ID from the request for security checks
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // If platform ID is provided, verify it belongs to this user
    let accessToken = process.env.SLACK_BOT_TOKEN;
    
    if (platformId) {
      const platform = await storage.getPlatformById(platformId);
      if (!platform) {
        return res.status(404).json({ message: "Platform not found" });
      }
      
      if (platform.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this platform" });
      }
      
      if (platform.name !== "slack") {
        return res.status(400).json({ message: "Invalid platform type" });
      }
      
      // Use the stored token if available
      if (platform.accessToken) {
        accessToken = platform.accessToken;
      }
    }
    
    // Initialize Slack client with the appropriate token
    const slack = new WebClient(accessToken);
    
    console.log("Fetching messages from Slack channel");
    
    // Get messages from the configured channel
    const result = await slack.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID!,
      limit: 15 // Fetch slightly more messages
    });
    
    if (!result.ok) {
      throw new Error("Failed to fetch messages from Slack");
    }
    
    // Get user information to display real names
    const userCache: Record<string, any> = {};
    
    // Create a helper for getting user info (with caching)
    const getUserInfo = async (slackUserId: string) => {
      if (userCache[slackUserId]) return userCache[slackUserId];
      
      try {
        const userResult = await slack.users.info({ user: slackUserId });
        if (userResult.ok && userResult.user) {
          userCache[slackUserId] = userResult.user;
          return userResult.user;
        }
      } catch (error) {
        console.warn(`Could not fetch info for user ${slackUserId}:`, error);
      }
      
      return null;
    };
    
    // Transform Slack messages to our format (with async/await for user resolution)
    const messagesPromises = result.messages?.map(async (msg: any) => {
      let senderName = msg.user || "Unknown User";
      
      // Try to get the real user name
      if (msg.user) {
        const userInfo = await getUserInfo(msg.user);
        if (userInfo) {
          senderName = userInfo.real_name || userInfo.name || senderName;
        }
      }
      
      return {
        id: msg.ts,
        senderId: msg.user,
        senderName: senderName,
        content: msg.text,
        timestamp: new Date(parseInt(msg.ts.split('.')[0]) * 1000),
        isRead: true
      };
    }) || [];
    
    const messages = await Promise.all(messagesPromises);
    
    console.log(`Retrieved ${messages.length} messages from Slack`);
    res.json(messages);
  } catch (error) {
    console.error("Error getting Slack messages:", error);
    res.status(500).json({ message: "Failed to fetch Slack messages" });
  }
}

// Send Slack message
// Disconnect from Slack
export async function disconnectSlack(req: Request, res: Response) {
  try {
    // Get user ID from the request
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Find the user's connected Slack platforms
    const platforms = await storage.getPlatformsByUserId(userId);
    const slackPlatforms = platforms.filter(p => p.name === "slack" && p.isConnected);
    
    if (slackPlatforms.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No connected Slack platform found" 
      });
    }
    
    // Disconnect all found Slack platforms
    for (const platform of slackPlatforms) {
      console.log(`Disconnecting Slack platform ID: ${platform.id}`);
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
    }
    
    console.log(`Successfully disconnected ${slackPlatforms.length} Slack platforms for user ${userId}`);
    
    // Redirect back to settings page with success parameter
    res.json({
      success: true,
      message: "Slack has been disconnected successfully"
    });
  } catch (error) {
    console.error("Error disconnecting from Slack:", error);
    let errorMessage = "Failed to disconnect from Slack";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
}

// Send Slack message
export async function sendSlackMessage(req: Request, res: Response) {
  const { message, blocks } = req.body;
  
  if (!message && !blocks) {
    return res.status(400).json({ message: "Message text or blocks are required" });
  }
  
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured"
    });
  }
  
  try {
    // Get platform ID from the request
    const platformId = req.params.platformId ? parseInt(req.params.platformId) : undefined;
    
    // Get user ID from the request for security checks
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // If platform ID is provided, verify it belongs to this user
    let accessToken = process.env.SLACK_BOT_TOKEN;
    
    if (platformId) {
      const platform = await storage.getPlatformById(platformId);
      if (!platform) {
        return res.status(404).json({ message: "Platform not found" });
      }
      
      if (platform.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this platform" });
      }
      
      if (platform.name !== "slack") {
        return res.status(400).json({ message: "Invalid platform type" });
      }
      
      // Use the stored token if available
      if (platform.accessToken) {
        accessToken = platform.accessToken;
      }
    }
    
    // Initialize Slack client with the appropriate token
    const slack = new WebClient(accessToken);
    
    console.log("Sending message to Slack channel");
    
    // Build the message payload
    const messagePayload: any = {
      channel: process.env.SLACK_CHANNEL_ID!,
      text: message || "Message from Dana AI"
    };
    
    // Add blocks if provided
    if (blocks) {
      messagePayload.blocks = blocks;
    }
    
    // Support for thread replies (if thread_ts is provided)
    if (req.body.thread_ts) {
      messagePayload.thread_ts = req.body.thread_ts;
    }
    
    // Send a message to the configured channel
    const result = await slack.chat.postMessage(messagePayload);
    
    if (!result.ok) {
      throw new Error("Failed to send message to Slack");
    }
    
    console.log("Successfully sent message to Slack");
    
    // Update analytics for this user (increment messages sent)
    try {
      await storage.incrementTotalMessages(userId);
    } catch (analyticError) {
      console.warn("Failed to update analytics:", analyticError);
    }
    
    res.json({ 
      success: true, 
      message: "Message sent successfully",
      messageId: result.ts,
      threadTs: (result as any).thread_ts || result.ts,
      channel: result.channel
    });
  } catch (error) {
    console.error("Error sending Slack message:", error);
    if (error instanceof Error) {
      res.status(500).json({ 
        success: false,
        message: `Failed to send Slack message: ${error.message}`
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: "Failed to send Slack message" 
      });
    }
  }
}