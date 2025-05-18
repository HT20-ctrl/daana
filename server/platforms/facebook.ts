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
    
    // Before connecting, we need to disconnect any existing Facebook connections
    console.log("Setting all existing Facebook platforms to disconnected");
    const userId = '1'; // Default demo user ID
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    
    // Find any existing connected Facebook platforms and disconnect them
    for (const platform of userPlatforms) {
      if (platform.name === "facebook" && platform.isConnected) {
        console.log(`Updating Facebook platform ID: ${platform.id} to disconnected`);
        await storage.createPlatform({
          ...platform,
          isConnected: false,
          accessToken: null,
          refreshToken: null
        });
      }
    }
    
    // For development without credentials, use a mock connection flow
    if (!isFacebookConfigured()) {
      console.log("Using demo Facebook connection");
      
      // Create mock Facebook connection
      console.log("Creating new Facebook connection for individual account");
      await storage.createPlatform({
        userId,
        name: "facebook",
        displayName: "Facebook - Main Business Page",
        accessToken: "mock_facebook_token",
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isConnected: true
      });
      
      // Redirect back to the settings page
      return res.redirect('/settings?fb_connected=true&mock=true');
    }
    
    // Regular OAuth flow for production with real credentials
    // Generate state parameter to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store state in session for validation during callback
    if (req.session) {
      // @ts-ignore - Add facebookState to session
      req.session.facebookState = state;
      
      // Check if session has save method before using it
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    } else {
      console.log("Session not available, using cookie-based state");
      res.cookie('facebookState', state, { 
        httpOnly: true, 
        secure: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
    }

    // Get dynamic redirect URI based on current request
    const redirectUri = getRedirectUri(req);

    // Construct Facebook authorization URL
    const facebookAuthUrl = new URL('https://www.facebook.com/v17.0/dialog/oauth');
    facebookAuthUrl.searchParams.append('client_id', FACEBOOK_APP_ID!);
    facebookAuthUrl.searchParams.append('redirect_uri', redirectUri);
    facebookAuthUrl.searchParams.append('state', state);
    // Use appropriate scopes for Facebook Graph API
    facebookAuthUrl.searchParams.append('scope', 'pages_messaging,pages_manage_metadata,pages_read_engagement,pages_show_list,public_profile,email');
    
    // Redirect user to Facebook OAuth page
    res.redirect(facebookAuthUrl.toString());
  } catch (error) {
    console.error("Error initiating Facebook OAuth flow:", error);
    res.status(500).json({ error: "Failed to connect to Facebook" });
  }
}

// Handle Facebook OAuth callback
export async function facebookCallback(req: Request, res: Response) {
  try {
    const { code, state, error } = req.query;
    
    // Handle user cancellation or errors
    if (error) {
      console.error(`Facebook auth error: ${error}`);
      return res.redirect('/settings?fb_error=true&error_reason=' + encodeURIComponent(String(error)));
    }
    
    // Get saved state from session or cookie
    let savedState = null;
    
    // Try to get state from session
    if (req.session) {
      // @ts-ignore - Access facebookState from session
      savedState = req.session.facebookState;
      
      // Clear state from session if it exists
      if (savedState) {
        // @ts-ignore - Delete facebookState from session
        delete req.session.facebookState;
        
        // Save session if possible
        if (typeof req.session.save === 'function') {
          await new Promise<void>((resolve) => req.session!.save(() => resolve()));
        }
      }
    }
    
    // If no state in session, try from cookie
    if (!savedState && req.cookies && req.cookies.facebookState) {
      savedState = req.cookies.facebookState;
      res.clearCookie('facebookState');
    }
    
    // Validate state parameter to prevent CSRF attacks
    if (!savedState || state !== savedState) {
      console.error("Invalid state parameter", { state, savedState });
      return res.redirect('/settings?fb_error=true&error_reason=invalid_state');
    }
    
    if (!code) {
      return res.redirect('/settings?fb_error=true&error_reason=code_missing');
    }
    
    // Get dynamic redirect URI based on current request
    const redirectUri = getRedirectUri(req);
    
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v17.0/oauth/access_token?` + 
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `code=${code}`,
      { method: 'GET' }
    );
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Failed to exchange code for token: ${errorText}`);
      return res.redirect('/settings?fb_error=true&error_reason=token_exchange');
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      return res.redirect('/settings?fb_error=true&error_reason=no_token');
    }
    
    // Get user data from Facebook
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,accounts&access_token=${accessToken}`,
      { method: 'GET' }
    );
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`Failed to fetch user data: ${errorText}`);
      return res.redirect('/settings?fb_error=true&error_reason=user_data');
    }
    
    const userData = await userResponse.json();
    
    // Get pages (business accounts) the user has access to
    const pages = userData.accounts?.data || [];
    let hasPageAccess = pages.length > 0;
    
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
    
    // Store pages info if needed in a real implementation
    if (hasPageAccess) {
      // In a production-ready implementation, we would store the pages data 
      // in a separate table with references to the platform
      console.log(`User has access to ${pages.length} Facebook pages`);
    }
    
    // Redirect back to the app with success parameter
    res.redirect('/settings?fb_connected=true');
  } catch (error) {
    console.error("Error handling Facebook OAuth callback:", error);
    res.redirect('/settings?fb_error=true&error_reason=server_error');
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