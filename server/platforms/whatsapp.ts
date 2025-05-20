import { Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";

// Check if WhatsApp API credentials are configured
export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_BUSINESS_ID && process.env.WHATSAPP_API_TOKEN);
}

// Get WhatsApp platform status
export async function getWhatsAppStatus(req: Request, res: Response) {
  res.json({ configured: isWhatsAppConfigured() });
}

// Connect to WhatsApp Business API
export async function connectWhatsApp(req: Request, res: Response) {
  try {
    console.log("WhatsApp connect endpoint called");
    
    // Get user ID from auth or use demo user
    const userId = (req.user as any)?.claims?.sub || "1"; // Default demo user ID
    console.log(`Connecting WhatsApp for user ID: ${userId}`);
    
    // Before connecting, we need to disconnect any existing WhatsApp connections
    console.log("Setting all existing WhatsApp platforms to disconnected");
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    
    // Find any existing connected WhatsApp platforms and disconnect them
    for (const platform of userPlatforms) {
      if (platform.name === "whatsapp" && platform.isConnected) {
        console.log(`Updating WhatsApp platform ID: ${platform.id} to disconnected`);
        await storage.updatePlatform(platform.id, {
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        });
      }
    }
    
    // Check if WhatsApp API is properly configured
    if (!isWhatsAppConfigured()) {
      console.warn("WhatsApp API credentials not configured! Please set WHATSAPP_BUSINESS_ID and WHATSAPP_API_TOKEN");
      return res.status(400).json({
        success: false,
        message: "WhatsApp API credentials not configured"
      });
    }

    // WhatsApp Business API uses a different flow than standard OAuth
    console.log("Starting WhatsApp Business API connection flow");
    
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store state and user ID in session for validation during callback
    if (req.session) {
      // @ts-ignore - Add WhatsApp OAuth data to session
      req.session.whatsapp_oauth = {
        state: state,
        userId: userId
      };
      
      // Check if session has save method before using it
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    } else {
      console.log("Session not available, using cookie-based state");
      res.cookie('whatsappOAuth', JSON.stringify({
        state: state,
        userId: userId
      }), { 
        httpOnly: true, 
        secure: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
    }
    
    // In production, we would use the WhatsApp Business API OAuth flow
    // This requires a properly configured business account with Facebook/Meta
    
    // Build the WhatsApp Business authorization URL
    const redirectUri = `${req.protocol}://${req.get('host')}/api/platforms/whatsapp/callback`;
    const authUrl = `https://business.facebook.com/wa/manage/apps/callback/?business_id=${
      process.env.WHATSAPP_BUSINESS_ID
    }&app_id=${
      process.env.FACEBOOK_APP_ID
    }&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log(`Redirecting to WhatsApp business authorization: ${authUrl}`);
    
    // Redirect the user to the WhatsApp business authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error connecting to WhatsApp:", error);
    let errorMessage = 'server_error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.redirect(`/app/settings?platform=whatsapp&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

// Handle WhatsApp Business API OAuth callback
export async function whatsappCallback(req: Request, res: Response) {
  try {
    console.log("WhatsApp callback received", req.query);
    const { state, error, code } = req.query;
    
    // Handle user cancellation or errors
    if (error) {
      console.error(`WhatsApp auth error: ${error}`);
      return res.redirect(`/app/settings?platform=whatsapp&status=error&error_reason=${encodeURIComponent(String(error))}`);
    }
    
    // Get saved OAuth data from session or cookie
    let oauthData = null;
    
    // Try to get OAuth data from session first
    if (req.session) {
      // @ts-ignore - Access whatsapp_oauth from session
      oauthData = req.session.whatsapp_oauth || null;
      
      // Clear state from session if it exists
      if (oauthData) {
        // @ts-ignore - Delete whatsapp_oauth from session
        delete req.session.whatsapp_oauth;
        
        // Save session if possible
        if (typeof req.session.save === 'function') {
          await new Promise<void>((resolve) => req.session!.save(() => resolve()));
        }
      }
    }
    
    // If no OAuth data in session, try from cookie
    if (!oauthData && req.cookies && req.cookies.whatsappOAuth) {
      try {
        oauthData = JSON.parse(req.cookies.whatsappOAuth);
        res.clearCookie('whatsappOAuth');
      } catch (e) {
        console.error("Error parsing WhatsApp OAuth cookie:", e);
      }
    }
    
    // Validate state parameter to prevent CSRF attacks
    if (!oauthData || !oauthData.state || state !== oauthData.state) {
      console.error("Invalid state parameter", { state, savedState: oauthData?.state });
      return res.redirect('/app/settings?platform=whatsapp&status=error&error_reason=invalid_state');
    }
    
    // Get user ID from OAuth data or fallback to demo user
    const userId = oauthData.userId || (req.user as any)?.claims?.sub || '1';
    console.log(`Processing WhatsApp connection for user: ${userId}`);
    
    if (!process.env.WHATSAPP_API_TOKEN) {
      console.warn("WhatsApp API token not configured in environment variables");
      return res.redirect('/app/settings?platform=whatsapp&status=error&error_reason=missing_api_token');
    }
    
    // In a real implementation, we would exchange the code for tokens
    // For WhatsApp Business Cloud API, this involves a different flow
    const token = process.env.WHATSAPP_API_TOKEN;
    const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
    
    // Check for existing WhatsApp platform for this user
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const existingWhatsApp = userPlatforms.find(p => p.name === "whatsapp");
    
    let platform;
    if (existingWhatsApp) {
      // Update existing platform
      console.log(`Updating existing WhatsApp platform ID: ${existingWhatsApp.id}`);
      platform = await storage.updatePlatform(existingWhatsApp.id, {
        displayName: "WhatsApp Business",
        accessToken: token,
        tokenExpiry: expiryDate,
        isConnected: true
      });
    } else {
      // Create a new platform record for WhatsApp
      console.log("Creating new WhatsApp platform record in database");
      platform = await storage.createPlatform({
        userId,
        name: "whatsapp",
        displayName: "WhatsApp Business",
        accessToken: token,
        refreshToken: null,
        tokenExpiry: expiryDate,
        isConnected: true
      });
    }
    
    console.log(`WhatsApp platform created/updated with ID: ${platform.id}`);
    
    // Redirect back to the settings page with success parameter
    res.redirect('/app/settings?platform=whatsapp&status=connected');
  } catch (error) {
    console.error("Error handling WhatsApp callback:", error);
    let errorMessage = 'server_error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.redirect(`/app/settings?platform=whatsapp&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

// Get WhatsApp messages
export async function getWhatsAppMessages(req: Request, res: Response) {
  try {
    // Here you would implement logic to fetch messages from WhatsApp Business API
    // This is a placeholder that returns mock data for now
    res.json({
      messages: [
        {
          id: "wa_msg_1",
          from: "+1234567890",
          text: "Hello, do you have this item in stock?",
          timestamp: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    console.error("Error getting WhatsApp messages:", error);
    res.status(500).json({ message: "Failed to fetch WhatsApp messages" });
  }
}

// Send WhatsApp message
export async function sendWhatsAppMessage(req: Request, res: Response) {
  const { recipientId, message } = req.body;
  
  if (!recipientId || !message) {
    return res.status(400).json({ message: "Recipient ID and message are required" });
  }
  
  try {
    // Here you would implement logic to send a message through WhatsApp Business API
    // This is a placeholder that returns success for now
    res.json({ 
      success: true, 
      message: "Message sent successfully",
      recipient: recipientId,
      sentMessage: message
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    res.status(500).json({ message: "Failed to send WhatsApp message" });
  }
}