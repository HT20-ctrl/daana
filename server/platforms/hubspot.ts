import { Request, Response } from "express";
import axios from "axios";
import { storage } from "../storage";
import { Platform } from "@shared/schema";

// Check if HubSpot API credentials are configured
export function isHubSpotConfigured(): boolean {
  return !!(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET);
}

// Get the redirect URI for OAuth callbacks
function getRedirectUri(req: Request): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${req.headers.host}/api/platforms/hubspot/callback`;
}

/**
 * Endpoint to get HubSpot connection status
 */
export async function getHubSpotStatus(req: Request, res: Response) {
  try {
    // Get user ID from session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Check if HubSpot credentials are configured
    const configured = isHubSpotConfigured();
    
    // Check if the user already has a connected HubSpot platform
    const platforms = await storage.getPlatformsByUserId(userId);
    const hubspotPlatform = platforms.find(p => 
      p.name.toLowerCase() === "hubspot" && p.isConnected
    );
    
    return res.json({
      configured,
      connected: !!hubspotPlatform,
      platformId: hubspotPlatform?.id,
      displayName: hubspotPlatform?.displayName || "HubSpot",
      needsCredentials: !configured
    });
  } catch (error) {
    console.error("Error checking HubSpot status:", error);
    return res.status(500).json({ message: "Failed to check HubSpot status" });
  }
}

/**
 * Endpoint to connect to HubSpot via OAuth 2.0
 */
export async function connectHubSpot(req: Request, res: Response) {
  try {
    // Get user ID from session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // If HubSpot credentials are configured, start OAuth flow
    if (isHubSpotConfigured()) {
      // Store user ID in session for callback
      (req.session as any).hubspotState = {
        userId,
        state: crypto.randomUUID() // Generate a random state for security
      };
      
      // HubSpot OAuth authorization URL
      const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
      authUrl.searchParams.append('client_id', process.env.HUBSPOT_CLIENT_ID as string);
      authUrl.searchParams.append('redirect_uri', getRedirectUri(req));
      authUrl.searchParams.append('scope', 'contacts crm.objects.contacts.read offline');
      authUrl.searchParams.append('state', (req.session as any).hubspotState.state);
      
      // Redirect to HubSpot authorization page
      console.log(`Redirecting to HubSpot authorization: ${authUrl.toString()}`);
      return res.redirect(authUrl.toString());
    } else {
      // Development mode - create a mock HubSpot connection
      console.log("Using development mode for HubSpot connection");
      
      // Check if user already has a HubSpot connection
      const platforms = await storage.getPlatformsByUserId(userId);
      const existingHubSpotPlatforms = platforms.filter(p => 
        p.name.toLowerCase() === "hubspot" && p.isConnected
      );
      
      // Disconnect existing HubSpot platforms first
      for (const platform of existingHubSpotPlatforms) {
        console.log(`Disconnecting existing HubSpot platform ID: ${platform.id}`);
        await storage.updatePlatform(platform.id, {
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        });
      }
      
      // Create a new mock HubSpot connection
      const mockToken = `dev-hubspot-token-${Date.now()}`;
      const mockExpiry = new Date(Date.now() + 7200 * 1000); // 2 hours from now
      
      const newPlatform = await storage.createPlatform({
        userId,
        name: "hubspot",
        displayName: "HubSpot (Development)",
        accessToken: mockToken,
        refreshToken: "dev-refresh-token",
        tokenExpiry: mockExpiry,
        isConnected: true
      });
      
      console.log(`Created development HubSpot connection with ID: ${newPlatform.id}`);
      
      // Redirect to settings page with success parameter
      return res.redirect('/app/settings?platform=hubspot&status=connected&dev=true');
    }
  } catch (error) {
    console.error("Error connecting to HubSpot:", error);
    let errorMessage = "Failed to connect to HubSpot";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return res.redirect(`/app/settings?platform=hubspot&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

/**
 * Endpoint to handle HubSpot OAuth callback
 */
export async function hubspotCallback(req: Request, res: Response) {
  try {
    // Get code and state from query parameters
    const { code, state } = req.query;
    
    // Verify state to prevent CSRF attacks
    if (!(req.session as any)?.hubspotState || 
        (req.session as any).hubspotState.state !== state) {
      return res.redirect('/app/settings?platform=hubspot&status=error&error_reason=Invalid_state');
    }
    
    // Get user ID from session
    const userId = (req.session as any).hubspotState.userId;
    
    if (!code) {
      return res.redirect('/app/settings?platform=hubspot&status=error&error_reason=Authorization_declined');
    }
    
    // Exchange code for access token
    const tokenResponse = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        redirect_uri: getRedirectUri(req),
        code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Calculate token expiration time
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000));
    
    // Get HubSpot account info
    const accountInfo = await axios.get('https://api.hubapi.com/integrations/v1/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    
    const accountName = accountInfo.data.hub_domain || 'HubSpot Account';
    
    // Check if user already has a HubSpot connection
    const platforms = await storage.getPlatformsByUserId(userId);
    const existingHubSpotPlatforms = platforms.filter(p => 
      p.name.toLowerCase() === "hubspot" && p.isConnected
    );
    
    // Disconnect existing HubSpot platforms first
    for (const platform of existingHubSpotPlatforms) {
      console.log(`Disconnecting existing HubSpot platform ID: ${platform.id}`);
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
    }
    
    // Create new HubSpot platform connection
    const newPlatform = await storage.createPlatform({
      userId,
      name: "hubspot",
      displayName: `HubSpot (${accountName})`,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry,
      isConnected: true
    });
    
    console.log(`Created HubSpot connection with ID: ${newPlatform.id}`);
    
    // Clear session data
    delete (req.session as any).hubspotState;
    
    // Redirect to settings page with success status
    return res.redirect(`/app/settings?platform=hubspot&status=connected&account=${encodeURIComponent(accountName)}`);
  } catch (error) {
    console.error("Error in HubSpot callback:", error);
    let errorMessage = "Failed to complete HubSpot connection";
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return res.redirect(`/app/settings?platform=hubspot&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

/**
 * Endpoint to disconnect from HubSpot
 */
export async function disconnectHubSpot(req: Request, res: Response) {
  try {
    // Get user ID from session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Find all HubSpot platforms to disconnect
    const platforms = await storage.getPlatformsByUserId(userId);
    const hubspotPlatforms = platforms.filter(p => 
      p.name.toLowerCase() === "hubspot" && p.isConnected
    );
    
    if (hubspotPlatforms.length === 0) {
      return res.status(404).json({ message: "No connected HubSpot platform found" });
    }
    
    // Disconnect all matching platforms
    let disconnectedCount = 0;
    for (const platform of hubspotPlatforms) {
      console.log(`Disconnecting HubSpot platform ID: ${platform.id}`);
      
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
      
      disconnectedCount++;
    }
    
    console.log(`Successfully disconnected ${disconnectedCount} HubSpot platforms for user ${userId}`);
    
    return res.status(200).json({ 
      success: true, 
      message: "HubSpot has been disconnected successfully" 
    });
  } catch (error) {
    console.error("Error disconnecting HubSpot:", error);
    return res.status(500).json({ message: "Failed to disconnect HubSpot" });
  }
}

/**
 * Helper function to refresh HubSpot token when expired
 */
async function refreshHubSpotToken(platform: Platform): Promise<Platform> {
  try {
    if (!platform.refreshToken) {
      throw new Error("No refresh token available");
    }
    
    // Exchange refresh token for new access token
    const tokenResponse = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        refresh_token: platform.refreshToken
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Calculate new token expiration time
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000));
    
    // Update platform with new tokens
    const updatedPlatform = await storage.updatePlatform(platform.id, {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry
    });
    
    console.log(`Refreshed HubSpot tokens for platform ID: ${platform.id}`);
    return updatedPlatform;
  } catch (error) {
    console.error("Error refreshing HubSpot token:", error);
    
    // Mark platform as disconnected on token refresh failure
    await storage.updatePlatform(platform.id, {
      isConnected: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null
    });
    
    throw new Error("Failed to refresh HubSpot token");
  }
}

/**
 * Check and refresh HubSpot token if needed
 */
async function getValidHubSpotToken(platform: Platform): Promise<string> {
  // If token is expired or will expire in the next 5 minutes, refresh it
  const now = new Date();
  const tokenExpiryTime = platform.tokenExpiry ? new Date(platform.tokenExpiry) : new Date(0);
  const expiresInMs = tokenExpiryTime.getTime() - now.getTime();
  
  if (expiresInMs < 5 * 60 * 1000) {
    console.log(`HubSpot token expired or expiring soon for platform ID: ${platform.id}`);
    const refreshedPlatform = await refreshHubSpotToken(platform);
    return refreshedPlatform.accessToken;
  }
  
  return platform.accessToken;
}

/**
 * Endpoint to get HubSpot contacts
 */
export async function getHubSpotContacts(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name.toLowerCase() !== "hubspot") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "HubSpot platform is not connected" });
    }
    
    // Check if we're using real HubSpot credentials or dev mode
    if (isHubSpotConfigured() && platform.accessToken && !platform.accessToken.startsWith('dev-')) {
      try {
        // Get valid access token (refreshing if needed)
        const accessToken = await getValidHubSpotToken(platform);
        
        // Fetch contacts from HubSpot API
        const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            limit: 10,
            properties: 'firstname,lastname,email,phone,company,hs_lastmodifieddate,createdate'
          }
        });
        
        // Transform HubSpot response to our format
        const contacts = response.data.results.map(contact => {
          return {
            id: contact.id,
            firstName: contact.properties.firstname || '',
            lastName: contact.properties.lastname || '',
            email: contact.properties.email || '',
            phone: contact.properties.phone || '',
            company: contact.properties.company || '',
            lastActivity: contact.properties.hs_lastmodifieddate || contact.properties.createdate
          };
        });
        
        return res.json(contacts);
      } catch (error) {
        console.error("Error fetching HubSpot contacts:", error);
        
        if (error.response?.status === 401) {
          // Token might be invalid - disconnect the platform
          await storage.updatePlatform(platform.id, {
            isConnected: false,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null
          });
          
          return res.status(401).json({ 
            message: "HubSpot authentication failed. Please reconnect your account." 
          });
        }
        
        return res.status(500).json({ 
          message: "Error fetching contacts from HubSpot API",
          error: error.response?.data?.message || error.message
        });
      }
    } else {
      // Return mock data for development mode
      const mockContacts = [
        {
          id: "1",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe@example.com",
          phone: "+1234567890",
          company: "Acme Inc",
          lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "2",
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          phone: "+1987654321",
          company: "Global Tech",
          lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "3",
          firstName: "Michael",
          lastName: "Johnson",
          email: "michael.johnson@example.com",
          phone: "+1122334455",
          company: "Johnson & Co",
          lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "4",
          firstName: "Sarah",
          lastName: "Williams",
          email: "sarah.williams@example.com",
          phone: "+1555666777",
          company: "Tech Solutions",
          lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      return res.json(mockContacts);
    }
  } catch (error) {
    console.error("Error retrieving HubSpot contacts:", error);
    return res.status(500).json({ message: "Failed to retrieve HubSpot contacts" });
  }
}

/**
 * Endpoint to create a HubSpot contact
 */
export async function createHubSpotContact(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    const { firstName, lastName, email, phone, company } = req.body;
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name.toLowerCase() !== "hubspot") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "HubSpot platform is not connected" });
    }
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    // Check if we're using real HubSpot credentials or dev mode
    if (isHubSpotConfigured() && platform.accessToken && !platform.accessToken.startsWith('dev-')) {
      try {
        // Get valid access token (refreshing if needed)
        const accessToken = await getValidHubSpotToken(platform);
        
        // Create contact in HubSpot API
        const response = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts', {
          properties: {
            firstname: firstName,
            lastname: lastName,
            email: email,
            phone: phone,
            company: company
          }
        }, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Return created contact
        const newContact = {
          id: response.data.id,
          firstName: response.data.properties.firstname || firstName,
          lastName: response.data.properties.lastname || lastName,
          email: response.data.properties.email || email,
          phone: response.data.properties.phone || phone,
          company: response.data.properties.company || company,
          lastActivity: new Date().toISOString()
        };
        
        return res.json(newContact);
      } catch (error) {
        console.error("Error creating HubSpot contact:", error);
        
        if (error.response?.status === 401) {
          // Token might be invalid - disconnect the platform
          await storage.updatePlatform(platform.id, {
            isConnected: false,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null
          });
          
          return res.status(401).json({ 
            message: "HubSpot authentication failed. Please reconnect your account." 
          });
        }
        
        return res.status(500).json({ 
          message: "Error creating contact in HubSpot API",
          error: error.response?.data?.message || error.message
        });
      }
    } else {
      // Return mock data for development mode
      const newContact = {
        id: Math.floor(Math.random() * 1000).toString(),
        firstName: firstName || '',
        lastName: lastName || '',
        email: email,
        phone: phone || '',
        company: company || '',
        lastActivity: new Date().toISOString()
      };
      
      return res.json(newContact);
    }
  } catch (error) {
    console.error("Error creating HubSpot contact:", error);
    return res.status(500).json({ message: "Failed to create HubSpot contact" });
  }
}