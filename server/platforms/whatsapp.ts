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
  if (!isWhatsAppConfigured()) {
    return res.status(400).json({ 
      message: "WhatsApp API credentials not configured. Please add WHATSAPP_BUSINESS_ID and WHATSAPP_API_TOKEN to your environment variables." 
    });
  }

  try {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    req.session.whatsappState = state;

    // In a real implementation, this would redirect to Meta's WhatsApp Business API authorization
    // Since WhatsApp Business API doesn't have a standard OAuth flow like Facebook, 
    // we would typically implement a direct API connection here
    
    // Build a simulated authorization URL for consistency with other platforms
    const authUrl = `https://business.facebook.com/wa/manage/?business_id=${
      process.env.WHATSAPP_BUSINESS_ID
    }&state=${state}`;

    // Redirect the user to the WhatsApp business authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error connecting to WhatsApp:", error);
    res.status(500).json({ message: "Failed to connect to WhatsApp" });
  }
}

// Handle WhatsApp OAuth callback (simulated since WhatsApp uses a different connection flow)
export async function whatsappCallback(req: Request, res: Response) {
  const { state } = req.query;
  
  // Validate state for CSRF protection
  if (!state || state !== req.session.whatsappState) {
    return res.status(400).json({ message: "Invalid state parameter" });
  }
  
  // Clean up session state
  delete req.session.whatsappState;
  
  try {
    // Get user ID from authenticated user
    const userId = req.user?.claims?.sub || "demo";
    
    // Create WhatsApp platform in database
    await storage.createPlatform({
      name: "whatsapp",
      displayName: "WhatsApp Business",
      userId: userId,
      accessToken: process.env.WHATSAPP_API_TOKEN || "mock-token",
      refreshToken: null,
      tokenExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      isConnected: true
    });
    
    // Redirect back to the app with success parameter
    res.redirect(`/?wa_connected=true`);
  } catch (error) {
    console.error("Error in WhatsApp callback:", error);
    res.redirect(`/?wa_connected=false`);
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