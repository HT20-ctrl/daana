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
    
    // Before connecting, we need to disconnect any existing WhatsApp connections
    console.log("Setting all existing WhatsApp platforms to disconnected");
    const userId = '1'; // Default demo user ID
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    
    // Find any existing connected WhatsApp platforms and disconnect them
    for (const platform of userPlatforms) {
      if (platform.name === "whatsapp" && platform.isConnected) {
        console.log(`Updating WhatsApp platform ID: ${platform.id} to disconnected`);
        await storage.createPlatform({
          ...platform,
          isConnected: false,
          accessToken: null,
          refreshToken: null
        });
      }
    }
    
    // For development without credentials, use a mock connection flow
    if (!isWhatsAppConfigured()) {
      console.log("Using demo WhatsApp connection");
      
      // Create mock WhatsApp connection
      console.log("Creating new WhatsApp connection for business account");
      await storage.createPlatform({
        userId,
        name: "whatsapp",
        displayName: "WhatsApp Business",
        accessToken: "mock_whatsapp_token",
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isConnected: true
      });
      
      // Redirect back to the settings page
      return res.redirect('/settings?wa_connected=true&mock=true');
    }

    // In a production implementation, we would use WhatsApp's cloud API registration flow
    // The actual mechanism for WhatsApp Business API requires phone number verification
    // and business account setup first, which is different from standard OAuth
    
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    if (req.session) {
      // @ts-ignore - Add whatsappState to session
      req.session.whatsappState = state;
      
      // Check if session has save method before using it
      if (typeof req.session.save === 'function') {
        await new Promise<void>((resolve) => req.session!.save(() => resolve()));
      }
    } else {
      console.log("Session not available, using cookie-based state");
      res.cookie('whatsappState', state, { 
        httpOnly: true, 
        secure: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
    }
    
    // In a real implementation, we would redirect to WhatsApp's business registration
    // or to Facebook's business manager which handles WhatsApp Business accounts
    
    // Build a simulated authorization URL for consistency with other platforms
    // In production, this would point to Meta's WhatsApp Business Platform
    const authUrl = `https://business.facebook.com/wa/manage/?business_id=${
      process.env.WHATSAPP_BUSINESS_ID || "placeholder_business_id"
    }&state=${state}`;

    console.log(`Redirecting to WhatsApp business registration: ${authUrl}`);
    
    // Redirect the user to the WhatsApp business authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error connecting to WhatsApp:", error);
    res.status(500).json({ message: "Failed to connect to WhatsApp" });
  }
}

// Handle WhatsApp OAuth callback (simulated since WhatsApp uses a different connection flow)
export async function whatsappCallback(req: Request, res: Response) {
  try {
    console.log("WhatsApp callback received");
    const { state, error } = req.query;
    
    // Handle user cancellation or errors
    if (error) {
      console.error(`WhatsApp auth error: ${error}`);
      return res.redirect('/settings?wa_error=true&error_reason=' + encodeURIComponent(String(error)));
    }
    
    // Get saved state from session or cookie
    let savedState = null;
    
    // Try to get state from session
    if (req.session) {
      // @ts-ignore - Access whatsappState from session
      savedState = req.session.whatsappState;
      
      // Clear state from session if it exists
      if (savedState) {
        // @ts-ignore - Delete whatsappState from session
        delete req.session.whatsappState;
        
        // Save session if possible
        if (typeof req.session.save === 'function') {
          await new Promise<void>((resolve) => req.session!.save(() => resolve()));
        }
      }
    }
    
    // If no state in session, try from cookie
    if (!savedState && req.cookies && req.cookies.whatsappState) {
      savedState = req.cookies.whatsappState;
      res.clearCookie('whatsappState');
    }
    
    // Validate state parameter to prevent CSRF attacks
    if (!savedState || state !== savedState) {
      console.error("Invalid state parameter", { state, savedState });
      return res.redirect('/settings?wa_error=true&error_reason=invalid_state');
    }
    
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
    
    // Use provided API token if available
    const token = process.env.WHATSAPP_API_TOKEN || "wa_demo_token_" + Math.random().toString(36).substring(2);
    console.log("Creating WhatsApp platform record in database");
    
    // Create a platform record for WhatsApp
    const platform = await storage.createPlatform({
      userId,
      name: "whatsapp",
      displayName: "WhatsApp Business",
      accessToken: token,
      refreshToken: null,
      tokenExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      isConnected: true
    });
    
    console.log(`WhatsApp platform created with ID: ${platform.id}`);
    
    // Redirect back to the settings page with success parameter
    res.redirect('/settings?wa_connected=true');
  } catch (error) {
    console.error("Error handling WhatsApp callback:", error);
    res.redirect('/settings?wa_error=true&error_reason=server_error');
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