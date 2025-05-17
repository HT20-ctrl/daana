import { Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";

// Check if Instagram API credentials are configured
export function isInstagramConfigured(): boolean {
  // Instagram uses the same API as Facebook (Meta Graph API)
  return !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

// Connect to Instagram using OAuth
export async function connectInstagram(req: Request, res: Response) {
  try {
    console.log("Instagram connect endpoint called");
    
    // Before connecting, we need to disconnect any existing Instagram connections
    console.log("Setting all existing Instagram platforms to disconnected");
    const userId = '1'; // Default demo user ID
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    
    // Find any existing connected Instagram platforms and disconnect them
    for (const platform of userPlatforms) {
      if (platform.name === "instagram" && platform.isConnected) {
        console.log(`Updating Instagram platform ID: ${platform.id} to disconnected`);
        await storage.createPlatform({
          ...platform,
          isConnected: false,
          accessToken: null,
          refreshToken: null
        });
      }
    }
    
    // For development without credentials, use a mock connection flow
    if (!isInstagramConfigured()) {
      console.log("Using demo Instagram connection");
      
      // Create mock Instagram connection
      console.log("Creating new Instagram connection for individual account");
      await storage.createPlatform({
        userId,
        name: "instagram",
        displayName: "Instagram - Business Account",
        accessToken: "mock_instagram_token",
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isConnected: true
      });
      
      // Redirect back to the settings page
      return res.redirect('/settings?ig_connected=true&mock=true');
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    if (!req.session) {
      req.session = {};
    }
    req.session.instagramState = state;
    await new Promise<void>((resolve) => req.session.save(() => resolve()));

    // Instagram (as part of Meta) uses the same OAuth flow as Facebook
    const redirectUri = `${req.protocol}://${req.hostname}/api/platforms/instagram/callback`;
    
    // Scope for Instagram includes instagram_basic, instagram_manage_comments, etc.
    const scope = "instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_messaging,public_profile";
    
    // Build the authorization URL
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${
      process.env.FACEBOOK_APP_ID
    }&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=${scope}&response_type=code`;

    console.log(`Redirecting to Instagram auth URL: ${authUrl}`);
    
    // Redirect the user to the Instagram authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error connecting to Instagram:", error);
    res.status(500).json({ message: "Failed to connect to Instagram" });
  }
}

// Handle Instagram OAuth callback
export async function instagramCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  
  // Validate state for CSRF protection
  if (!state || state !== req.session.instagramState) {
    return res.status(400).json({ message: "Invalid state parameter" });
  }
  
  // Clean up session state
  delete req.session.instagramState;
  
  if (!code) {
    return res.redirect(`/?ig_connected=false`);
  }
  
  try {
    const redirectUri = `${req.protocol}://${req.hostname}/api/platforms/instagram/callback`;
    
    // Exchange code for token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${
        process.env.FACEBOOK_APP_ID
      }&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`,
      { method: "GET" }
    );
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error("Failed to obtain access token");
    }
    
    // Get user info to confirm Instagram connection
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`,
      { method: "GET" }
    );
    
    const userData = await userResponse.json();
    
    // Get user ID from authenticated user
    const userId = req.user?.claims?.sub || "demo";
    
    // Create Instagram platform in database
    await storage.createPlatform({
      name: "instagram",
      displayName: "Instagram",
      userId: userId,
      accessToken: tokenData.access_token,
      refreshToken: null,
      tokenExpiry: tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000) 
        : null,
      isConnected: true
    });
    
    // Redirect back to the app with success parameter
    res.redirect(`/?ig_connected=true`);
  } catch (error) {
    console.error("Error in Instagram callback:", error);
    res.redirect(`/?ig_connected=false`);
  }
}

// Get Instagram messages
export async function getInstagramMessages(req: Request, res: Response) {
  try {
    // Here you would implement logic to fetch messages from Instagram Graph API
    // This is a placeholder that returns mock data for now
    res.json({
      messages: [
        {
          id: "ig_msg_1",
          from: "instagram_user_123",
          text: "Hi, I'm interested in your product",
          timestamp: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    console.error("Error getting Instagram messages:", error);
    res.status(500).json({ message: "Failed to fetch Instagram messages" });
  }
}

// Send Instagram message
export async function sendInstagramMessage(req: Request, res: Response) {
  const { recipientId, message } = req.body;
  
  if (!recipientId || !message) {
    return res.status(400).json({ message: "Recipient ID and message are required" });
  }
  
  try {
    // Here you would implement logic to send a message through Instagram Graph API
    // This is a placeholder that returns success for now
    res.json({ 
      success: true, 
      message: "Message sent successfully",
      recipient: recipientId,
      sentMessage: message
    });
  } catch (error) {
    console.error("Error sending Instagram message:", error);
    res.status(500).json({ message: "Failed to send Instagram message" });
  }
}

// Get Instagram platform status
export async function getInstagramStatus(req: Request, res: Response) {
  try {
    const isConfigured = isInstagramConfigured();
    res.json({ 
      configured: isConfigured,
      needsCredentials: !isConfigured
    });
  } catch (error) {
    console.error("Error checking Instagram configuration:", error);
    res.status(500).json({ error: "Failed to check Instagram configuration" });
  }
}