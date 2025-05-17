import { Request, Response } from "express";
import { storage } from "../storage";
import sgMail from "@sendgrid/mail";

// Check if Email API credentials are configured
export function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

// Get Email platform status
export async function getEmailStatus(req: Request, res: Response) {
  res.json({ 
    configured: isEmailConfigured(),
    needsCredentials: !isEmailConfigured()
  });
}

// Connect to Email API
export async function connectEmail(req: Request, res: Response) {
  if (!isEmailConfigured()) {
    return res.status(400).json({ 
      message: "Email API credentials not configured. Please add SENDGRID_API_KEY to your environment variables." 
    });
  }

  try {
    // Set up SendGrid with API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    
    // Test the API key by making a basic call
    // In a real implementation, this would verify the API key works
    
    // Get user ID from authenticated user
    const userId = req.user?.claims?.sub || "demo";
    
    // Create Email platform in database
    await storage.createPlatform({
      name: "email",
      displayName: "Email Integration",
      userId: userId,
      accessToken: process.env.SENDGRID_API_KEY,
      refreshToken: null,
      tokenExpiry: null, // API keys don't expire
      isConnected: true
    });
    
    // Redirect back to the app with success parameter
    res.redirect(`/settings?email_connected=true`);
  } catch (error) {
    console.error("Error connecting to Email:", error);
    res.status(500).json({ message: "Failed to connect to Email" });
  }
}

// Get Email messages (inbox)
export async function getEmailMessages(req: Request, res: Response) {
  if (!isEmailConfigured()) {
    return res.status(400).json({ 
      message: "Email API credentials not configured"
    });
  }

  try {
    // In a real implementation, you would fetch messages from an inbox
    // using SendGrid's API or other email APIs
    
    // Returning mock data for the prototype
    const messages = [
      {
        id: "email-msg-1",
        senderId: "customer@example.com",
        senderName: "John Customer",
        content: "I have a question about my recent order #12345",
        subject: "Order Inquiry",
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        isRead: true
      },
      {
        id: "email-msg-2",
        senderId: "support@competitor.com",
        senderName: "Jane Potential",
        content: "I'm interested in your enterprise plan. Can you send me more information?",
        subject: "Enterprise Plan Information",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        isRead: false
      },
      {
        id: "email-msg-3",
        senderId: "billing@partner.com",
        senderName: "Finance Team",
        content: "Your invoice #INV-567 is now available",
        subject: "Invoice Available",
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        isRead: false
      }
    ];
    
    res.json(messages);
  } catch (error) {
    console.error("Error getting Email messages:", error);
    res.status(500).json({ message: "Failed to fetch Email messages" });
  }
}

// Send Email message
export async function sendEmailMessage(req: Request, res: Response) {
  const { to, subject, message } = req.body;
  
  if (!to || !subject || !message) {
    return res.status(400).json({ message: "Email recipient, subject, and message content are required" });
  }
  
  if (!isEmailConfigured()) {
    return res.status(400).json({ 
      message: "Email API credentials not configured"
    });
  }
  
  try {
    if (process.env.SENDGRID_API_KEY) {
      // Set up SendGrid
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      // Configure the email
      const msg = {
        to: to,
        from: 'noreply@dana-ai.com', // Use a verified sender in a real implementation
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>')
      };
      
      // Send the email
      await sgMail.send(msg);
      
      res.json({ 
        success: true, 
        message: "Email sent successfully" 
      });
    } else {
      // Mock sending when we don't have credentials
      console.log(`[MOCK] Email would be sent to ${to} with subject: ${subject}`);
      res.json({ 
        success: true, 
        message: "Email would be sent (mock mode)",
        mock: true
      });
    }
  } catch (error) {
    console.error("Error sending Email:", error);
    res.status(500).json({ message: "Failed to send Email" });
  }
}