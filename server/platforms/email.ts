import { Request, Response } from "express";
import { storage } from "../storage";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";

// Check if Email API credentials are configured
export function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

// Check if Google OAuth is configured
export function isGoogleOAuthConfigured(): boolean {
  return !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;
}

// Get Email platform status
export async function getEmailStatus(req: Request, res: Response) {
  res.json({ 
    configured: isEmailConfigured() || isGoogleOAuthConfigured(),
    needsCredentials: !isEmailConfigured() && !isGoogleOAuthConfigured()
  });
}

// Connect to Email API (Main entry point that decides which connection method to use)
export async function connectEmail(req: Request, res: Response) {
  // Get the email provider from query params, default to gmail
  const provider = req.query.provider || "gmail";
  
  if (provider === "gmail") {
    return googleOAuthRedirect(req, res);
  } else if (provider === "sendgrid") {
    return connectSendGrid(req, res);
  } else {
    return res.status(400).json({ 
      message: "Invalid email provider specified" 
    });
  }
}

// Connect using SendGrid
async function connectSendGrid(req: Request, res: Response) {
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
      displayName: "SendGrid Email Integration",
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

// Google OAuth redirect with real credentials
export async function googleOAuthRedirect(req: Request, res: Response) {
  try {
    // Check if Google OAuth is configured
    if (!isGoogleOAuthConfigured()) {
      console.error("Google OAuth credentials are not configured");
      return res.status(400).json({ 
        message: "Google OAuth credentials are not properly configured." 
      });
    }
    
    // Create a "state" token to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15);
    
    // Construct the OAuth URL with the real client ID
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    
    // Define the redirect URI - this must exactly match one of the authorized redirect URIs
    // configured in your Google Cloud Console project
    const redirectUri = 'https://dana-ai-project.replit.app/api/platforms/email/google/callback';
    
    // Define the scopes we need - simplified to basic profile access
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email', 
      'https://www.googleapis.com/auth/userinfo.profile'
      // Removed Gmail scope which may require additional verification
    ];
    
    // Build the Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId!);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.append('prompt', 'consent'); // Force consent screen
    authUrl.searchParams.append('state', state);
    
    console.log(`Redirecting to Google OAuth: ${authUrl.toString()}`);
    
    // Redirect the user to Google's authorization page
    res.redirect(authUrl.toString());
    
  } catch (error) {
    console.error("Error starting Google OAuth flow:", error);
    res.status(500).json({ message: "Failed to initiate Google authentication" });
  }
}

// Google OAuth callback
export async function googleOAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  
  if (!code) {
    console.error("No authorization code received from Google");
    return res.redirect('/settings?email_error=true&reason=no_code');
  }
  
  try {
    // Get user ID from the session or use demo user
    const userId = req.user?.claims?.sub || "1";
    
    // Check if using real Google OAuth or simulated
    if (isGoogleOAuthConfigured()) {
      // Real Google OAuth implementation
      // 1. Exchange the authorization code for tokens
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      
      // Use the exact same redirect URI that was registered in Google Cloud Console
      // This is critical for OAuth to work properly
      const redirectUri = 'https://dana-ai-project.replit.app/api/platforms/email/google/callback';
      
      // Exchange authorization code for tokens
      const tokenResponse = await exchangeCodeForTokens(
        code.toString(),
        clientId!,
        clientSecret!,
        redirectUri
      );
      
      if (!tokenResponse || !tokenResponse.access_token) {
        console.error("Failed to exchange code for tokens");
        return res.redirect('/settings?email_error=true&reason=token_exchange_failed');
      }
      
      console.log("Successfully obtained access token from Google");
      
      // 2. Get user email and profile information
      const userInfo = await fetchGoogleUserInfo(tokenResponse.access_token);
      
      if (!userInfo || !userInfo.email) {
        console.error("Failed to fetch user info from Google");
        return res.redirect('/settings?email_error=true&reason=userinfo_failed');
      }
      
      // 3. Save the tokens and user info
      const accessToken = tokenResponse.access_token;
      const refreshToken = tokenResponse.refresh_token || null;
      const expiresIn = tokenResponse.expires_in || 3600; // Default to 1 hour
      
      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);
      
      // Create or update the platform connection
      const platforms = await storage.getPlatformsByUserId(userId);
      const existingEmail = platforms.find(p => p.name === "email");
      
      // Display name includes the Gmail account
      const displayName = `Gmail (${userInfo.email})`;
      
      if (existingEmail) {
        // Update existing platform connection
        await storage.updatePlatform(existingEmail.id, {
          displayName,
          accessToken,
          refreshToken,
          tokenExpiry,
          isConnected: true
        });
      } else {
        // Create new platform in database
        await storage.createPlatform({
          name: "email",
          displayName,
          userId,
          accessToken,
          refreshToken,
          tokenExpiry,
          isConnected: true
        });
      }
      
      // Redirect back to settings page with success parameter
      return res.redirect('/settings?email_connected=true');
    } else {
      // Simulated flow (when no real credentials are available)
      console.log("Using simulated Google OAuth flow");
      
      // Create or update the platform connection
      const platforms = await storage.getPlatformsByUserId(userId);
      const existingEmail = platforms.find(p => p.name === "email");
      
      const simulatedAccessToken = "google-token-" + Math.random().toString(36).substring(2, 15);
      const simulatedRefreshToken = "google-refresh-" + Math.random().toString(36).substring(2, 15);
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token expires in 1 hour
      
      if (existingEmail) {
        // Update existing platform connection
        await storage.updatePlatform(existingEmail.id, {
          displayName: "Gmail Integration (Simulated)",
          accessToken: simulatedAccessToken,
          refreshToken: simulatedRefreshToken,
          tokenExpiry: tokenExpiry,
          isConnected: true
        });
      } else {
        // Create new platform in database
        await storage.createPlatform({
          name: "email",
          displayName: "Gmail Integration (Simulated)",
          userId: userId,
          accessToken: simulatedAccessToken,
          refreshToken: simulatedRefreshToken,
          tokenExpiry: tokenExpiry,
          isConnected: true
        });
      }
      
      // Redirect back to the settings page with success parameter
      return res.redirect(`/settings?email_connected=true&simulated=true`);
    }
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    return res.redirect(`/settings?email_error=true&reason=internal_error`);
  }
}

// Helper function to exchange authorization code for tokens
async function exchangeCodeForTokens(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Token exchange error:", errorData);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    return null;
  }
}

// Helper function to fetch user information using access token
async function fetchGoogleUserInfo(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("User info fetch error:", errorData);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching user information:", error);
    return null;
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