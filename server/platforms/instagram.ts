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
    if (req.session) {
      // @ts-ignore - Add instagramState to session
      req.session.instagramState = state;
      
      // Check if session has save method before using it
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    } else {
      console.log("Session not available, using cookie-based state");
      res.cookie('instagramState', state, { 
        httpOnly: true, 
        secure: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
    }

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
  try {
    console.log("Instagram callback received");
    const { code, state, error } = req.query;
    
    // Handle user cancellation or errors
    if (error) {
      console.error(`Instagram auth error: ${error}`);
      return res.redirect('/settings?ig_error=true&error_reason=' + encodeURIComponent(String(error)));
    }
    
    // Get saved state from session or cookie
    let savedState = null;
    
    // Try to get state from session
    if (req.session) {
      // @ts-ignore - Access instagramState from session
      savedState = req.session.instagramState;
      
      // Clear state from session if it exists
      if (savedState) {
        // @ts-ignore - Delete instagramState from session
        delete req.session.instagramState;
        
        // Save session if possible
        if (typeof req.session.save === 'function') {
          await new Promise<void>((resolve) => req.session!.save(() => resolve()));
        }
      }
    }
    
    // If no state in session, try from cookie
    if (!savedState && req.cookies && req.cookies.instagramState) {
      savedState = req.cookies.instagramState;
      res.clearCookie('instagramState');
    }
    
    // Validate state parameter to prevent CSRF attacks
    if (!savedState || state !== savedState) {
      console.error("Invalid state parameter", { state, savedState });
      return res.redirect('/settings?ig_error=true&error_reason=invalid_state');
    }
    
    if (!code) {
      return res.redirect('/settings?ig_error=true&error_reason=code_missing');
    }
    
    // Prepare redirect URI - must match exactly what was used during authorization
    const redirectUri = `${req.protocol}://${req.hostname}/api/platforms/instagram/callback`;
    console.log(`Using redirect URI: ${redirectUri}`);
    
    // Exchange code for token
    console.log("Exchanging authorization code for access token");
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${process.env.FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
      `code=${code}`,
      { method: "GET" }
    );
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Failed to exchange code for token: ${errorText}`);
      return res.redirect('/settings?ig_error=true&error_reason=token_exchange');
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      console.error("No access token received from Instagram API");
      return res.redirect('/settings?ig_error=true&error_reason=no_token');
    }
    
    console.log("Successfully obtained Instagram access token");
    
    // Get user data to verify the connection
    console.log("Fetching user account information from Instagram Graph API");
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,accounts,instagram_business_account&access_token=${accessToken}`,
      { method: "GET" }
    );
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`Failed to fetch user data: ${errorText}`);
      return res.redirect('/settings?ig_error=true&error_reason=user_data');
    }
    
    const userData = await userResponse.json();
    console.log(`Retrieved user data for: ${userData.name || 'Unknown user'}`);
    
    // Get a user ID from session or use demo ID
    let userId = '1'; // Default demo user ID
    
    // If in a real auth environment, get from the request user
    if (req.user && typeof req.user === 'object' && 'sub' in req.user) {
      userId = String(req.user.sub);
    } else if (req.user && typeof req.user === 'object' && 'id' in req.user) {
      userId = String(req.user.id);
    } else if (req.user && typeof req.user === 'object' && 'claims' in req.user) {
      // @ts-ignore - Handle Replit Auth format
      userId = req.user.claims.sub || userId;
    }
    
    // Create a platform record for Instagram
    console.log("Creating Instagram platform record in database");
    const platform = await storage.createPlatform({
      userId,
      name: "instagram",
      displayName: `Instagram (${userData.name || 'Business Account'})`,
      accessToken,
      refreshToken: null,
      tokenExpiry: tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000) 
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days default
      isConnected: true
    });
    
    console.log(`Instagram platform created with ID: ${platform.id}`);
    
    // Redirect back to the settings page with success parameter
    res.redirect('/settings?ig_connected=true');
  } catch (error) {
    console.error("Error handling Instagram OAuth callback:", error);
    res.redirect('/settings?ig_error=true&error_reason=server_error');
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

// Helper function to find Instagram platforms for a user
async function findInstagramPlatforms(userId: string) {
  const userPlatforms = await storage.getPlatformsByUserId(userId);
  const instagramPlatforms = userPlatforms.filter(p => p.name === "instagram");
  
  // Log for debugging but exclude sensitive info
  const simplified = instagramPlatforms.map(p => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    isConnected: p.isConnected,
    hasToken: !!p.accessToken
  }));
  
  console.log("Instagram platforms for user:", simplified);
  return instagramPlatforms;
}

// Get Instagram platform status
export async function getInstagramStatus(req: Request, res: Response) {
  try {
    const isConfigured = isInstagramConfigured();
    
    // Check for user's Instagram platforms
    const userId = req.user?.claims?.sub || "1"; // Default to demo user if no auth
    
    // Find connected Instagram platforms
    const platforms = await findInstagramPlatforms(userId);
    const isConnected = platforms.some(p => p.isConnected === true);
    
    res.json({ 
      configured: isConfigured,
      connected: isConnected,
      needsCredentials: !isConfigured,
      message: isConnected 
        ? "Instagram is connected" 
        : isConfigured 
          ? "Instagram API is configured and ready to connect" 
          : "Instagram API credentials required"
    });
  } catch (error) {
    console.error("Error checking Instagram configuration:", error);
    res.status(500).json({ error: "Failed to check Instagram configuration" });
  }
}

// Disconnect Instagram
export async function disconnectInstagram(req: Request, res: Response) {
  try {
    // Get user ID from auth or use demo user
    const userId = req?.user?.claims?.sub || "1";
    
    console.log(`Attempting to disconnect Instagram for user ${userId}`);
    
    // Find all connected Instagram platforms
    const instagramPlatforms = await findInstagramPlatforms(userId);
    
    if (instagramPlatforms.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No Instagram accounts found to disconnect" 
      });
    }
    
    // Update each platform to disconnect it
    for (const platform of instagramPlatforms) {
      if (platform.isConnected) {
        console.log(`Disconnecting Instagram platform ID ${platform.id}`);
        
        await storage.updatePlatform(platform.id, {
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        });
      }
    }
    
    // Verify disconnection
    const updatedPlatforms = await findInstagramPlatforms(userId);
    const stillConnected = updatedPlatforms.some(p => p.isConnected === true);
    
    if (stillConnected) {
      console.error("Failed to disconnect all Instagram platforms");
      return res.status(500).json({
        success: false,
        message: "Failed to disconnect Instagram completely"
      });
    }
    
    res.json({
      success: true,
      message: "Instagram has been disconnected successfully"
    });
  } catch (error) {
    console.error("Error disconnecting Instagram:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to disconnect Instagram"
    });
  }
}