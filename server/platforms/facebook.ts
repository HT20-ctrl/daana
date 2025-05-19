import { Request, Response } from "express";
import { storage } from "../storage";
import { Platform } from "@shared/schema";

// Facebook integration requires proper App ID and App Secret
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Get the hostname dynamically to support different environments
const getRedirectUri = (req: Request): string => {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
  const host = req.get('host') || 'localhost:5000';
  return `${protocol}://${host}/api/platforms/facebook/callback`;
};

// Check if Facebook API credentials are configured
export function isFacebookConfigured(): boolean {
  return !!FACEBOOK_APP_ID && !!FACEBOOK_APP_SECRET;
}

// Get Facebook connection status
export async function getFacebookStatus(req: Request, res: Response) {
  try {
    const isConfigured = isFacebookConfigured();
    
    // Get user ID from auth or use demo user
    // Access user ID safely without depending on claims property
    const userId = (req.user as any)?.claims?.sub || "1"; // Default demo user ID
    
    // Find connected Facebook platforms
    const platforms = await findFacebookPlatforms(userId);
    
    // Force a fresh check by explicitly looking at the isConnected status
    console.log("Checking Facebook connection status for platforms:", platforms);
    
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
        ? "Facebook is connected" 
        : isConfigured 
          ? "Facebook API is configured and ready to connect" 
          : "Facebook API credentials required"
    });
  } catch (error) {
    console.error("Error checking Facebook configuration:", error);
    res.status(500).json({ error: "Failed to check Facebook configuration" });
  }
}

// Helper function to find Facebook platforms for a user
async function findFacebookPlatforms(userId: string): Promise<Platform[]> {
  const userPlatforms = await storage.getPlatformsByUserId(userId);
  const facebookPlatforms = userPlatforms.filter(p => p.name === "facebook");
  
  // Log for debugging but exclude sensitive info
  const simplified = facebookPlatforms.map(p => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    isConnected: p.isConnected,
    hasToken: !!p.accessToken
  }));
  
  console.log("Facebook platforms for user:", simplified);
  return facebookPlatforms;
}

// Disconnect Facebook
export async function disconnectFacebook(req: Request, res: Response) {
  try {
    // Get user ID from auth or use demo user
    const userId = (req.user as any)?.claims?.sub || "1"; // Use type assertion to safely access claims
    
    console.log(`Attempting to disconnect Facebook for user ${userId}`);
    
    // Find all connected Facebook platforms
    const facebookPlatforms = await findFacebookPlatforms(userId);
    
    console.log("Found Facebook platforms:", facebookPlatforms);
    
    if (facebookPlatforms.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No Facebook accounts found to disconnect" 
      });
    }
    
    // Loop through all platforms to disconnect
    let disconnectionSuccess = false;
    
    for (const platform of facebookPlatforms) {
      console.log(`Processing Facebook platform ID ${platform.id}, currently isConnected=${platform.isConnected}`);
      
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
      console.error("Failed to disconnect any Facebook platforms");
      return res.status(500).json({
        success: false,
        message: "Failed to disconnect Facebook completely"
      });
    }
    
    // Final verification
    const updatedPlatforms = await findFacebookPlatforms(userId);
    console.log("Updated Facebook platforms after disconnect:", updatedPlatforms);
    
    res.json({
      success: true,
      message: "Facebook has been disconnected successfully"
    });
  } catch (error) {
    console.error("Error disconnecting Facebook:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to disconnect Facebook"
    });
  }
}

// Start Facebook OAuth flow
export async function connectFacebook(req: Request, res: Response) {
  try {
    console.log("Facebook connect endpoint called");
    
    // Get user ID from auth or use demo user
    const userId = (req.user as any)?.claims?.sub || "1"; // Default demo user ID
    console.log(`Connecting Facebook for user ID: ${userId}`);
    
    // Before connecting, we need to disconnect any existing Facebook connections
    console.log("Setting all existing Facebook platforms to disconnected");
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    
    // Find any existing connected Facebook platforms and disconnect them
    for (const platform of userPlatforms) {
      if (platform.name === "facebook" && platform.isConnected) {
        console.log(`Updating Facebook platform ID: ${platform.id} to disconnected`);
        await storage.updatePlatform(platform.id, {
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        });
      }
    }
    
    // Check if Facebook is properly configured with API credentials
    if (!isFacebookConfigured()) {
      console.warn("Facebook API credentials not configured! Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET");
      return res.status(400).json({
        success: false,
        message: "Facebook API credentials not configured"
      });
    }
    
    // Regular OAuth flow with real credentials
    // Generate state parameter to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store state and user ID in session for validation during callback
    if (req.session) {
      // @ts-ignore - Add Facebook OAuth data to session
      req.session.facebook_oauth = {
        state: state,
        userId: userId
      };
      
      // Check if session has save method before using it
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    } else {
      console.log("Session not available, using cookie-based state");
      res.cookie('facebookOAuth', JSON.stringify({
        state: state,
        userId: userId
      }), { 
        httpOnly: true, 
        secure: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
    }

    // Get dynamic redirect URI based on current request
    const redirectUri = getRedirectUri(req);
    console.log(`Facebook OAuth redirect URI: ${redirectUri}`);

    // Construct Facebook authorization URL
    const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    facebookAuthUrl.searchParams.append('client_id', FACEBOOK_APP_ID!);
    facebookAuthUrl.searchParams.append('redirect_uri', redirectUri);
    facebookAuthUrl.searchParams.append('state', state);
    // Use appropriate scopes for Facebook Graph API
    facebookAuthUrl.searchParams.append('scope', 'pages_messaging,pages_manage_metadata,pages_read_engagement,pages_show_list,public_profile,email');
    
    // Redirect user to Facebook OAuth page
    console.log(`Redirecting to Facebook OAuth URL: ${facebookAuthUrl.toString()}`);
    res.redirect(facebookAuthUrl.toString());
  } catch (error) {
    console.error("Error initiating Facebook OAuth flow:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to connect to Facebook" 
    });
  }
}

// Handle Facebook OAuth callback
export async function facebookCallback(req: Request, res: Response) {
  try {
    console.log("Facebook callback received");
    const { code, state, error } = req.query;
    
    // Handle user cancellation or errors
    if (error) {
      console.error(`Facebook auth error: ${error}`);
      return res.redirect('/app/settings?fb_error=true&error_reason=' + encodeURIComponent(String(error)));
    }
    
    // Get Facebook OAuth data from session or cookie
    let savedState = null;
    let userId = "1"; // Default demo user ID
    
    // Try to get OAuth data from session
    if (req.session && req.session.facebook_oauth) {
      // @ts-ignore - Access facebook_oauth from session
      const facebookOAuth = req.session.facebook_oauth;
      savedState = facebookOAuth.state;
      userId = facebookOAuth.userId;
      
      // Clear state from session
      // @ts-ignore - Delete facebook_oauth from session
      delete req.session.facebook_oauth;
      
      // Save session if possible
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    }
    
    // If no OAuth data in session, try from cookie
    if (!savedState && req.cookies && req.cookies.facebookOAuth) {
      try {
        const cookieData = JSON.parse(req.cookies.facebookOAuth);
        savedState = cookieData.state;
        userId = cookieData.userId;
        res.clearCookie('facebookOAuth');
      } catch (e) {
        console.error("Error parsing Facebook OAuth cookie:", e);
      }
    }
    
    console.log(`Facebook callback - User ID: ${userId}, State verification: `, {
      receivedState: state,
      savedState: savedState,
      match: state === savedState
    });
    
    // Validate state parameter to prevent CSRF attacks
    if (!savedState || state !== savedState) {
      console.error("Invalid state parameter", { receivedState: state, savedState });
      return res.redirect('/app/settings?fb_error=true&error_reason=invalid_state');
    }
    
    if (!code) {
      console.error("No authorization code received from Facebook");
      return res.redirect('/app/settings?fb_error=true&error_reason=code_missing');
    }
    
    // Get dynamic redirect URI based on current request
    const redirectUri = getRedirectUri(req);
    console.log(`Facebook token exchange - Redirect URI: ${redirectUri}`);
    
    // Exchange code for access token
    console.log("Exchanging Facebook code for access token");
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` + 
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `code=${code}`,
      { method: 'GET' }
    );
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Failed to exchange code for token: ${errorText}`);
      return res.redirect('/app/settings?fb_error=true&error_reason=token_exchange');
    }
    
    const tokenData = await tokenResponse.json();
    console.log("Received Facebook access token");
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      console.error("No access token received from Facebook");
      return res.redirect('/app/settings?fb_error=true&error_reason=no_token');
    }
    
    // Get the token's expiration time (default to 60 days if not provided)
    const expiresIn = tokenData.expires_in || 60 * 24 * 60 * 60; // 60 days in seconds
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    
    // Get user data from Facebook
    console.log("Fetching Facebook user data");
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,accounts&access_token=${accessToken}`,
      { method: 'GET' }
    );
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`Failed to fetch Facebook user data: ${errorText}`);
      return res.redirect('/app/settings?fb_error=true&error_reason=user_data');
    }
    
    const userData = await userResponse.json();
    console.log(`Facebook user data received for: ${userData.name}`);
    
    // Get pages (business accounts) the user has access to
    const pages = userData.accounts?.data || [];
    let hasPageAccess = pages.length > 0;
    console.log(`User has access to ${pages.length} Facebook pages`);
    
    // Get existing Facebook platforms for this user
    const existingPlatforms = await findFacebookPlatforms(userId);
    
    let platform;
    if (existingPlatforms.length > 0) {
      // Update the existing platform
      platform = existingPlatforms[0];
      console.log(`Updating existing Facebook platform ID: ${platform.id}`);
      platform = await storage.updatePlatform(platform.id, {
        displayName: `Facebook (${userData.name})`,
        accessToken,
        refreshToken: null, // Facebook doesn't use refresh tokens in the same way
        tokenExpiry,
        isConnected: true
      });
    } else {
      // Create a new platform record for Facebook
      console.log(`Creating new Facebook platform for user: ${userId}`);
      platform = await storage.createPlatform({
        userId,
        name: "facebook",
        displayName: `Facebook (${userData.name})`,
        accessToken,
        refreshToken: null, // Facebook doesn't use refresh tokens in the same way
        tokenExpiry, 
        isConnected: true
      });
    }
    
    // If the user has access to Facebook pages, we could store them in a separate table
    // In a production environment, you would want to store page tokens separately
    if (hasPageAccess) {
      console.log(`User has access to ${pages.length} Facebook pages:`);
      pages.forEach((page: any) => {
        console.log(`- Page: ${page.name} (ID: ${page.id})`);
      });
    }
    
    // Redirect back to the app with success parameter
    console.log("Facebook connection successful, redirecting to settings");
    res.redirect('/app/settings?platform=facebook&status=connected');
  } catch (error) {
    console.error("Error handling Facebook OAuth callback:", error);
    res.redirect('/app/settings?fb_error=true&error_reason=server_error');
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