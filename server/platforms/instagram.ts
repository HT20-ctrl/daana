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
    
    // Get user ID from auth or use demo user
    const userId = (req.user as any)?.claims?.sub || "1"; // Default demo user ID
    console.log(`Connecting Instagram for user ID: ${userId}`);
    
    // Before connecting, we need to disconnect any existing Instagram connections
    console.log("Setting all existing Instagram platforms to disconnected");
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    
    // Find any existing connected Instagram platforms and disconnect them
    for (const platform of userPlatforms) {
      if (platform.name === "instagram" && platform.isConnected) {
        console.log(`Updating Instagram platform ID: ${platform.id} to disconnected`);
        await storage.updatePlatform(platform.id, {
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        });
      }
    }
    
    // Check if Instagram API is properly configured with API credentials
    if (!isInstagramConfigured()) {
      console.warn("Instagram API credentials not configured! Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET");
      return res.status(400).json({
        success: false,
        message: "Instagram API credentials not configured"
      });
    }
    
    console.log("Starting Instagram OAuth authorization flow");

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store state and user ID in session for validation during callback
    if (req.session) {
      // @ts-ignore - Add Instagram OAuth data to session
      req.session.instagram_oauth = {
        state: state,
        userId: userId
      };
      
      // Check if session has save method before using it
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    } else {
      console.log("Session not available, using cookie-based state");
      res.cookie('instagramOAuth', JSON.stringify({
        state: state,
        userId: userId
      }), { 
        httpOnly: true, 
        secure: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
    }

    // Get dynamic redirect URI based on current request
    const redirectUri = `${req.protocol}://${req.get('host')}/api/platforms/instagram/callback`;
    console.log(`Instagram OAuth redirect URI: ${redirectUri}`);
    
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
    
    // Get Instagram OAuth data from session or cookie
    let savedState = null;
    let userId = "1"; // Default demo user ID
    
    // Try to get OAuth data from session
    if (req.session && req.session.instagram_oauth) {
      // @ts-ignore - Access instagram_oauth from session
      const instagramOAuth = req.session.instagram_oauth;
      savedState = instagramOAuth.state;
      userId = instagramOAuth.userId;
      
      // Clear state from session
      // @ts-ignore - Delete instagram_oauth from session
      delete req.session.instagram_oauth;
      
      // Save session if possible
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    }
    
    // If no OAuth data in session, try from cookie
    if (!savedState && req.cookies && req.cookies.instagramOAuth) {
      try {
        const cookieData = JSON.parse(req.cookies.instagramOAuth);
        savedState = cookieData.state;
        userId = cookieData.userId;
        res.clearCookie('instagramOAuth');
      } catch (e) {
        console.error("Error parsing Instagram OAuth cookie:", e);
      }
    }
    
    console.log(`Instagram callback - User ID: ${userId}, State verification: `, {
      receivedState: state,
      savedState: savedState,
      match: state === savedState
    });
    
    // Validate state parameter to prevent CSRF attacks
    if (!savedState || state !== savedState) {
      console.error("Invalid state parameter", { receivedState: state, savedState });
      return res.redirect('/app/settings?platform=instagram&status=error&error_reason=invalid_state');
    }
    
    if (!code) {
      console.error("No authorization code received from Instagram");
      return res.redirect('/app/settings?platform=instagram&status=error&error_reason=code_missing');
    }
    
    // Prepare redirect URI - must match exactly what was used during authorization
    const redirectUri = `${req.protocol}://${req.get('host')}/api/platforms/instagram/callback`;
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
      return res.redirect('/app/settings?platform=instagram&status=error&error_reason=token_exchange');
    }
    
    const tokenData = await tokenResponse.json();
    console.log("Received Instagram access token");
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      console.error("No access token received from Instagram API");
      return res.redirect('/app/settings?platform=instagram&status=error&error_reason=no_token');
    }
    
    // Get the token's expiration time (default to 60 days if not provided)
    const expiresIn = tokenData.expires_in || 60 * 24 * 60 * 60; // 60 days in seconds
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    
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
      return res.redirect('/app/settings?platform=instagram&status=error&error_reason=user_data');
    }
    
    const userData = await userResponse.json();
    console.log(`Retrieved user data for: ${userData.name || 'Unknown user'}`);
    
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
    const userId = (req.user as any)?.claims?.sub || "1"; // Default to demo user if no auth
    
    // Find connected Instagram platforms
    const platforms = await findInstagramPlatforms(userId);
    
    // Force a fresh check by explicitly looking at the isConnected status
    console.log("Checking Instagram connection status for platforms:", platforms);
    
    // A platform is considered connected if isConnected is true and it has an accessToken
    const isConnected = platforms.some(p => {
      const connected = p.isConnected === true && !!p.accessToken;
      console.log(`Platform ${p.id} connection status: ${connected} (isConnected=${p.isConnected}, hasToken=${!!p.accessToken})`);
      return connected;
    });
    
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
    const userId = (req.user as any)?.claims?.sub || "1"; // Use type assertion for safe access
    
    console.log(`Attempting to disconnect Instagram for user ${userId}`);
    
    // Find all connected Instagram platforms
    const instagramPlatforms = await findInstagramPlatforms(userId);
    
    console.log("Found Instagram platforms:", instagramPlatforms);
    
    if (instagramPlatforms.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No Instagram accounts found to disconnect" 
      });
    }
    
    // Loop through all platforms to disconnect
    let disconnectionSuccess = false;
    
    for (const platform of instagramPlatforms) {
      console.log(`Processing Instagram platform ID ${platform.id}, currently isConnected=${platform.isConnected}`);
      
      try {
        // Force disconnect by explicit overrides
        await storage.updatePlatform(platform.id, {
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        });
        
        // Double-check the update worked
        const updated = await storage.getPlatformById(platform.id);
        console.log(`After update, platform ${platform.id} status: isConnected=${updated?.isConnected}, hasToken=${!!updated?.accessToken}`);
        
        disconnectionSuccess = true;
      } catch (updateError) {
        console.error(`Failed to update platform ${platform.id}:`, updateError);
      }
    }
    
    if (!disconnectionSuccess) {
      console.error("Failed to disconnect any Instagram platforms");
      return res.status(500).json({
        success: false,
        message: "Failed to disconnect Instagram completely"
      });
    }
    
    // Final verification
    const updatedPlatforms = await findInstagramPlatforms(userId);
    console.log("Updated Instagram platforms after disconnect:", updatedPlatforms);
    
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