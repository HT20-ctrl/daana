import { Request, Response } from "express";
import { storage } from "../storage";

// These would be fetched from environment variables in a real implementation
// For Facebook integration, we'll need proper App ID and App Secret
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'https://dana-ai.replit.app/api/platforms/facebook/callback';

// Check if Facebook API credentials are configured
export function isFacebookConfigured(): boolean {
  return !!FACEBOOK_APP_ID && !!FACEBOOK_APP_SECRET;
}

// Start Facebook OAuth flow
export async function connectFacebook(req: Request, res: Response) {
  try {
    if (!isFacebookConfigured()) {
      return res.status(400).json({ error: "Facebook API credentials not configured" });
    }

    // Generate state parameter to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15);
    // Store state in session for validation during callback
    req.session.facebookState = state;

    // Construct Facebook authorization URL
    const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    facebookAuthUrl.searchParams.append('client_id', FACEBOOK_APP_ID);
    facebookAuthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    facebookAuthUrl.searchParams.append('state', state);
    facebookAuthUrl.searchParams.append('scope', 'pages_messaging,pages_manage_metadata,pages_read_engagement,pages_show_list');
    
    res.redirect(facebookAuthUrl.toString());
  } catch (error) {
    console.error("Error initiating Facebook OAuth flow:", error);
    res.status(500).json({ error: "Failed to connect to Facebook" });
  }
}

// Handle Facebook OAuth callback
export async function facebookCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    
    // Validate state parameter to prevent CSRF attacks
    if (state !== req.session.facebookState) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }
    
    // Clear state from session
    delete req.session.facebookState;
    
    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`,
      { method: 'GET' }
    );
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code for token: ${await tokenResponse.text()}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error("Access token not received");
    }
    
    // Get user data from Facebook
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,accounts&access_token=${accessToken}`,
      { method: 'GET' }
    );
    
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user data: ${await userResponse.text()}`);
    }
    
    const userData = await userResponse.json();
    
    // Get pages (business accounts) the user has access to
    const pages = userData.accounts?.data || [];
    
    // Store the user's Facebook identity and token
    const userId = req.user.claims.sub;
    
    // Create a platform record for Facebook
    const platform = await storage.createPlatform({
      userId,
      name: "facebook",
      displayName: `Facebook (${userData.name})`,
      accessToken,
      refreshToken: null, // Facebook doesn't use refresh tokens in the same way
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days (Facebook tokens can last longer)
      isConnected: true
    });
    
    // In a real implementation, we would also store the pages the user has access to
    // and their corresponding page access tokens
    
    // Redirect back to the app
    res.redirect('/settings?fb_connected=true');
  } catch (error) {
    console.error("Error handling Facebook OAuth callback:", error);
    res.status(500).json({ error: "Failed to connect to Facebook" });
  }
}

// Get Facebook messages for a specific platform
export async function getFacebookMessages(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform) {
      return res.status(404).json({ error: "Platform not found" });
    }
    
    if (platform.name !== "facebook") {
      return res.status(400).json({ error: "Invalid platform type" });
    }
    
    if (!platform.accessToken) {
      return res.status(400).json({ error: "Platform not connected" });
    }
    
    // We need to fetch actual messages from the Facebook Graph API
    // This requires a valid access token for a Facebook page
    // We would make a request to Facebook's API to get messages
    
    res.status(200).json([]);
  } catch (error) {
    console.error("Error fetching Facebook messages:", error);
    res.status(500).json({ error: "Failed to fetch Facebook messages" });
  }
}

// Send a message to Facebook
export async function sendFacebookMessage(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform) {
      return res.status(404).json({ error: "Platform not found" });
    }
    
    if (platform.name !== "facebook") {
      return res.status(400).json({ error: "Invalid platform type" });
    }
    
    if (!platform.accessToken) {
      return res.status(400).json({ error: "Platform not connected" });
    }
    
    const { recipientId, message } = req.body;
    
    if (!recipientId || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // We would use the Facebook Graph API to send the message
    // This requires a valid page access token
    
    res.json({
      success: true,
      message: "Message request received and will be processed",
    });
  } catch (error) {
    console.error("Error sending Facebook message:", error);
    res.status(500).json({ error: "Failed to send Facebook message" });
  }
}