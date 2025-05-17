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
    const isConfigured = isSlackConfigured();
    
    // Also check if user already has connected Slack
    const userId = "1"; // Default demo user ID
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const connectedSlack = userPlatforms.find(p => 
      p.name === "slack" && 
      p.isConnected && 
      p.accessToken
    );
    
    const isConnected = !!connectedSlack;
    
    res.json({
      configured: isConfigured,
      connected: isConnected,
      needsCredentials: !isConfigured,
      message: isConnected 
        ? "Slack is connected" 
        : isConfigured 
          ? "Slack API is configured and ready to connect" 
          : "Slack API credentials required"
    });
  } catch (error) {
    console.error("Error checking Slack configuration:", error);
    res.status(500).json({ error: "Failed to check Slack configuration" });
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
    req.session.slackState = state;

    // In a real implementation, this would redirect to Slack OAuth flow
    // Since we're using Bot tokens directly, we would just verify the token works
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test connection by getting info about the bot
    const botInfo = await slack.auth.test();
    
    if (!botInfo.ok) {
      throw new Error("Slack API token validation failed");
    }

    // Get user ID from authenticated user
    const userId = req.user?.claims?.sub || "1";
    
    // Create Slack platform in database
    await storage.createPlatform({
      name: "slack",
      displayName: `Slack (${botInfo.team})`,
      userId: userId,
      accessToken: process.env.SLACK_BOT_TOKEN,
      refreshToken: null,
      tokenExpiry: null, // Bot tokens don't expire
      isConnected: true
    });
    
    // Redirect back to the app with success parameter
    res.redirect(`/?slack_connected=true`);
  } catch (error) {
    console.error("Error connecting to Slack:", error);
    res.status(500).json({ message: "Failed to connect to Slack" });
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
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Get messages from the configured channel
    const result = await slack.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID!,
      limit: 10
    });
    
    if (!result.ok) {
      throw new Error("Failed to fetch messages from Slack");
    }
    
    // Transform Slack messages to our format
    const messages = result.messages?.map((msg: any) => {
      return {
        id: msg.ts,
        senderId: msg.user,
        senderName: msg.user, // In a real implementation, you would resolve user names
        content: msg.text,
        timestamp: new Date(parseInt(msg.ts.split('.')[0]) * 1000),
        isRead: true
      };
    }) || [];
    
    res.json(messages);
  } catch (error) {
    console.error("Error getting Slack messages:", error);
    res.status(500).json({ message: "Failed to fetch Slack messages" });
  }
}

// Send Slack message
export async function sendSlackMessage(req: Request, res: Response) {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ message: "Message text is required" });
  }
  
  if (!isSlackConfigured()) {
    return res.status(400).json({ 
      message: "Slack API credentials not configured"
    });
  }
  
  try {
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Send a message to the configured channel
    const result = await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID!,
      text: message
    });
    
    if (!result.ok) {
      throw new Error("Failed to send message to Slack");
    }
    
    res.json({ 
      success: true, 
      message: "Message sent successfully",
      messageId: result.ts
    });
  } catch (error) {
    console.error("Error sending Slack message:", error);
    res.status(500).json({ message: "Failed to send Slack message" });
  }
}