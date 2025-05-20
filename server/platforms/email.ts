import { Request, Response } from "express";
import { storage } from "../storage";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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
    const userId = (req.user as any)?.claims?.sub || "1";
    
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
    res.redirect(`/app/settings?platform=email&status=connected&provider=sendgrid`);
  } catch (error) {
    console.error("Error connecting to Email:", error);
    let errorMessage = "Failed to connect to Email";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.redirect(`/app/settings?platform=email&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
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
    
    // Locally for testing, when you click the link, use a redirect URI that works with localhost:5000
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host || req.hostname;
    let redirectUri = `${protocol}://${host}/api/platforms/email/google/callback`;
    
    // For production deployment, use the fixed Replit domain redirect
    if (host.includes('replit.app')) {
      redirectUri = 'https://dana-ai-project.replit.app/api/platforms/email/google/callback';
    }
    
    // Using Gmail API scope for sending emails
    const scopes = [
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.send'
    ];
    
    // Build the Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId!);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.append('include_granted_scopes', 'true');
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
      
      // Match the same dynamic redirect URI logic as in the authorization request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host || req.hostname;
      let redirectUri = `${protocol}://${host}/api/platforms/email/google/callback`;
      
      // For production deployment, use the fixed Replit domain redirect
      if (host.includes('replit.app')) {
        redirectUri = 'https://dana-ai-project.replit.app/api/platforms/email/google/callback';
      }
      
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
    console.log(`Attempting token exchange with:
      - Client ID: ${clientId.substring(0, 10)}...
      - Redirect URI: ${redirectUri}
      - Code length: ${code.length} characters`);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    const responseText = await response.text();
    console.log(`Google token response status: ${response.status}`);
    
    if (!response.ok) {
      console.error("Token exchange error:", responseText);
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parsing token response:", parseError);
      return null;
    }
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
  
  try {
    // Get user ID from the session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Find the email platform for this user
    const platforms = await storage.getPlatformsByUserId(userId);
    const emailPlatform = platforms.find(p => p.name === "email");
    
    if (!emailPlatform || !emailPlatform.isConnected) {
      return res.status(400).json({ 
        message: "No connected email platform found. Please connect an email platform first."
      });
    }
    
    // Check which email service to use
    if (emailPlatform.displayName.toLowerCase().includes("gmail")) {
      // Send using Gmail API
      if (!emailPlatform.accessToken) {
        return res.status(400).json({ message: "Gmail access token not found" });
      }
      
      const result = await sendEmailViaGmail(emailPlatform.accessToken, to, subject, message);
      return res.json(result);
    } else if (process.env.SENDGRID_API_KEY) {
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
        message: "Email sent successfully via SendGrid" 
      });
    } else {
      return res.status(400).json({ 
        message: "No configured email service available"
      });
    }
  } catch (error) {
    console.error("Error sending Email:", error);
    if (error instanceof Error) {
      res.status(500).json({ message: `Failed to send Email: ${error.message}` });
    } else {
      res.status(500).json({ message: "Failed to send Email" });
    }
  }
}

// Function to send an email via Gmail API
async function sendEmailViaGmail(accessToken: string, to: string, subject: string, messageText: string): Promise<any> {
  try {
    // Get the user ID associated with this token (for token refresh)
    const userId = "1"; // Default to demo user, would be retrieved from auth in production
    
    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      // Set redirect URI for token refresh
      process.env.REPLIT_DOMAINS?.includes('replit.app')
        ? 'https://dana-ai-project.replit.app/api/platforms/email/google/callback'
        : 'http://localhost:5000/api/platforms/email/google/callback'
    );
    
    // Find the email platform to check for a refresh token
    const platforms = await storage.getPlatformsByUserId(userId);
    const emailPlatform = platforms.find(p => p.name === "email" && p.displayName.toLowerCase().includes("gmail"));
    
    // Set credentials including refresh token if available
    const credentials: any = { access_token: accessToken };
    if (emailPlatform?.refreshToken) {
      credentials.refresh_token = emailPlatform.refreshToken;
    }
    
    oauth2Client.setCredentials(credentials);
    
    // Add token refresh handler
    oauth2Client.on('tokens', async (tokens) => {
      console.log('Token refresh occurred');
      if (tokens.access_token && emailPlatform) {
        console.log('Updating stored access token');
        
        // Calculate new expiry
        const expiryDate = tokens.expiry_date 
          ? new Date(tokens.expiry_date) 
          : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
        
        // Update the stored token
        await storage.updatePlatform(emailPlatform.id, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || emailPlatform.refreshToken,
          tokenExpiry: expiryDate
        });
      }
    });
    
    // Create Gmail API client
    const gmail = google.gmail({
      version: 'v1',
      auth: oauth2Client
    });
    
    // Construct email content in MIME format
    const emailLines = [
      `To: ${to}`,
      'From: Dana AI <noreply@dana-ai.com>',
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      messageText.replace(/\n/g, '<br>')
    ];
    
    // Join with CRLF as per RFC 2822
    const email = emailLines.join('\r\n');
    
    // Encode the email as base64url
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send the message
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    console.log('Email sent successfully via Gmail API:', result.data);
    
    return {
      success: true,
      message: "Email sent successfully via Gmail",
      messageId: result.data.id
    };
  } catch (error) {
    console.error('Error sending email via Gmail API:', error);
    throw error;
  }
}