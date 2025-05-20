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
    
    return res.json({ 
      configured: false, 
      connected: false,
      needsCredentials: !isSlackConfigured()
    });
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
    
    // Before connecting, check for and disconnect any existing Slack connections
    console.log("Checking for existing Slack connections");
    const platforms = await storage.getPlatformsByUserId(userId);
    const existingSlackPlatforms = platforms.filter(p => p.name === "slack" && p.isConnected);
    
    // Disconnect existing platforms
    for (const platform of existingSlackPlatforms) {
      console.log(`Disconnecting existing Slack platform ID: ${platform.id}`);
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
    }
    
    // We're using a bot token approach since it's already authenticated
    // In a production app, this would use the full OAuth flow with client ID/secret
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test connection by getting info about the bot
    console.log("Testing Slack connection with bot token");
    
    try {
      const botInfo = await slack.auth.test();
      
      if (!botInfo.ok) {
        throw new Error("Slack API token validation failed");
      }
      
      console.log(`Successfully connected to Slack workspace: ${botInfo.team}`);
      
      // Create new platform connection in database
      console.log("Creating new Slack platform connection");
      const newPlatform = await storage.createPlatform({
        name: "slack",
        displayName: `Slack (${botInfo.team})`,
        userId: userId,
        accessToken: process.env.SLACK_BOT_TOKEN as string,
        refreshToken: null,
        tokenExpiry: null, // Bot tokens don't expire
        isConnected: true
      });
      
      // Redirect back to the settings page with success parameter
      console.log(`Slack connection successful with platform ID: ${newPlatform.id}`);
      return res.redirect(`/app/settings?platform=slack&status=connected&workspace=${encodeURIComponent(botInfo.team as string)}`);
    } catch (apiError: any) {
      console.error("Slack API error:", apiError);
      
      // Check if this is an auth error
      if (apiError?.data?.error === 'invalid_auth') {
        console.log("Invalid Slack token provided - falling back to demo mode");
        
        // Create a demo Slack connection as fallback
        const workspaceName = "Demo Workspace";
        const demoToken = `demo-slack-token-${Date.now()}`;
        
        const platform = await storage.createPlatform({
          name: "slack",
          displayName: `Slack (${workspaceName})`,
          userId: userId,
          accessToken: demoToken,
          refreshToken: null,
          tokenExpiry: null,
          isConnected: true
        });
        
        console.log(`Created demo Slack connection with ID: ${platform.id}`);
        return res.redirect(`/app/settings?platform=slack&status=connected&workspace=${encodeURIComponent(workspaceName)}&demo=true`);
      } else {
        // For other errors, pass through to the main error handler
        throw apiError;
      }
    }
  } catch (error) {
    console.error("Error connecting to Slack:", error);
    let errorMessage = "Failed to connect to Slack";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return res.redirect(`/app/settings?platform=slack&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

// Get Slack messages
export async function getSlackMessages(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name !== "slack") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "Slack platform is not connected" });
    }
    
    // For a real implementation, we would use platform.accessToken to authenticate with Slack API
    if (isSlackConfigured() && platform.accessToken?.startsWith('xoxb-')) {
      // Real Slack API connection
      const slack = new WebClient(platform.accessToken);
      
      try {
        // Get conversations list (channels)
        const result = await slack.conversations.list({
          limit: 10,
          types: "public_channel,private_channel"
        });
        
        // Get messages from the channel specified in env vars
        const channelId = process.env.SLACK_CHANNEL_ID;
        const messagesResponse = await slack.conversations.history({
          channel: channelId,
          limit: 10
        });
        
        // Get user info for each message
        const userIds = new Set();
        messagesResponse.messages.forEach((msg: any) => {
          if (msg.user) {
            userIds.add(msg.user);
          }
        });
        
        const userProfiles: Record<string, any> = {};
        for (const userId of userIds) {
          try {
            const userInfo = await slack.users.info({ user: userId });
            userProfiles[userId] = userInfo.user;
          } catch (err) {
            console.error(`Could not get user info for ${userId}:`, err);
          }
        }
        
        // Format messages with user info
        const messages = messagesResponse.messages.map((msg: any) => {
          const user = userProfiles[msg.user] || { name: "Unknown", profile: { image_24: "" } };
          return {
            id: msg.ts,
            timestamp: new Date(parseInt(msg.ts.split('.')[0]) * 1000).toISOString(),
            text: msg.text,
            user: {
              id: msg.user,
              name: user.name,
              avatarUrl: user.profile?.image_24 || ""
            }
          };
        });
        
        return res.json({
          messages,
          channel: {
            id: channelId,
            name: channelId // We'd get the real name with conversations.info
          }
        });
      } catch (slackError) {
        console.error("Error fetching Slack messages:", slackError);
        return res.status(500).json({ 
          message: "Error fetching messages from Slack API",
          error: slackError.data?.error || slackError.message
        });
      }
    } else {
      // Fall back to demo data
      const mockMessages = [
        {
          id: "1654321098.123456",
          timestamp: new Date().toISOString(),
          text: "Hey team, how's the new feature coming along?",
          user: {
            id: "U12345678",
            name: "Sarah Johnson",
            avatarUrl: "https://via.placeholder.com/24"
          }
        },
        {
          id: "1654321099.123457",
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          text: "We're making good progress. Should be ready for review tomorrow.",
          user: {
            id: "U87654321",
            name: "Alex Chen",
            avatarUrl: "https://via.placeholder.com/24"
          }
        },
        {
          id: "1654321100.123458",
          timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
          text: "Great! Looking forward to seeing it. Do we need to schedule a demo?",
          user: {
            id: "U12345678",
            name: "Sarah Johnson",
            avatarUrl: "https://via.placeholder.com/24"
          }
        },
        {
          id: "1654321101.123459",
          timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
          text: "Yes, I'll set up a meeting for Thursday.",
          user: {
            id: "U87654321",
            name: "Alex Chen",
            avatarUrl: "https://via.placeholder.com/24"
          }
        },
        {
          id: "1654321102.123460",
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          text: "Reminder: We have the weekly standup in 15 minutes!",
          user: {
            id: "U11223344",
            name: "Dana AI Bot",
            avatarUrl: "https://via.placeholder.com/24"
          }
        }
      ];
      
      return res.json({
        messages: mockMessages,
        channel: {
          id: "C12345678",
          name: "general"
        }
      });
    }
  } catch (error) {
    console.error("Error retrieving Slack messages:", error);
    res.status(500).json({ message: "Failed to retrieve Slack messages" });
  }
}

// Disconnect from Slack
export async function disconnectSlack(req: Request, res: Response) {
  try {
    // Get user ID from the session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Find all Slack platforms to disconnect
    const platforms = await storage.getPlatformsByUserId(userId);
    const slackPlatforms = platforms.filter(p => 
      p.name.toLowerCase() === "slack" && p.isConnected
    );
    
    if (slackPlatforms.length === 0) {
      return res.status(404).json({ message: "No connected Slack platform found" });
    }
    
    // Disconnect all matching platforms
    let disconnectedCount = 0;
    for (const platform of slackPlatforms) {
      console.log(`Disconnecting Slack platform ID: ${platform.id}`);
      
      // Debug info for better logging
      console.log(`Updating platform ${platform.id}: {
  before: { id: ${platform.id}, name: '${platform.name}', isConnected: ${platform.isConnected}, hasToken: ${!!platform.accessToken} },
  updates: {
    isConnected: false,
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null
  }
}`);
      
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
      
      console.log("Platform " + platform.id + " is being disconnected - explicitly setting connection data to null");
      
      // Debug updated platform
      const updatedPlatform = await storage.getPlatformById(platform.id);
      console.log(`Platform ${platform.id} after update: { id: ${updatedPlatform.id}, name: '${updatedPlatform.name}', isConnected: ${updatedPlatform.isConnected}, hasToken: ${!!updatedPlatform.accessToken} }`);
      
      disconnectedCount++;
    }
    
    console.log(`Successfully disconnected ${disconnectedCount} Slack platforms for user ${userId}`);
    
    return res.status(200).json({ 
      success: true, 
      message: "Slack has been disconnected successfully" 
    });
  } catch (error) {
    console.error("Error disconnecting Slack:", error);
    return res.status(500).json({ message: "Failed to disconnect Slack" });
  }
}

// Send a message to a Slack channel
export async function sendSlackMessage(req: Request, res: Response) {
  try {
    const { platformId, channelId, message } = req.body;
    
    if (!platformId || !message) {
      return res.status(400).json({ message: "platformId and message are required" });
    }
    
    const platform = await storage.getPlatformById(parseInt(platformId));
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name !== "slack") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "Slack platform is not connected" });
    }
    
    // Use either the channel from the request or the default channel from environment variables
    const targetChannelId = channelId || process.env.SLACK_CHANNEL_ID;
    
    if (!targetChannelId) {
      return res.status(400).json({ message: "Channel ID is required" });
    }
    
    // For a real implementation, we would use platform.accessToken to authenticate with Slack API
    if (isSlackConfigured() && platform.accessToken?.startsWith('xoxb-')) {
      // Real Slack API connection
      const slack = new WebClient(platform.accessToken);
      
      try {
        // Send message to the specified channel
        const result = await slack.chat.postMessage({
          channel: targetChannelId,
          text: message
        });
        
        return res.json({
          success: true,
          messageId: result.ts,
          channel: result.channel
        });
      } catch (slackError) {
        console.error("Error sending Slack message:", slackError);
        return res.status(500).json({ 
          message: "Error sending message to Slack API",
          error: slackError.data?.error || slackError.message
        });
      }
    } else {
      // Simulate sending a message for demo purposes
      const messageId = Date.now().toString();
      console.log(`[DEMO] Sending Slack message to channel ${targetChannelId}: ${message}`);
      
      return res.json({
        success: true,
        messageId: messageId,
        channel: targetChannelId,
        demo: true
      });
    }
  } catch (error) {
    console.error("Error sending Slack message:", error);
    res.status(500).json({ message: "Failed to send Slack message" });
  }
}