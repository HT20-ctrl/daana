import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import { storage } from "../storage";
import { Platform } from "@shared/schema";

// Check if Salesforce API credentials are configured
export function isSalesforceConfigured(): boolean {
  return !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET);
}

// Get the redirect URI for OAuth callbacks
function getRedirectUri(req: Request): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${req.headers.host}/api/platforms/salesforce/callback`;
}

/**
 * Endpoint to get Salesforce connection status
 */
export async function getSalesforceStatus(req: Request, res: Response) {
  try {
    // Get user ID from session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Check if Salesforce credentials are configured
    const configured = isSalesforceConfigured();
    
    // Check if the user already has a connected Salesforce platform
    const platforms = await storage.getPlatformsByUserId(userId);
    const salesforcePlatform = platforms.find(p => 
      p.name.toLowerCase() === "salesforce" && p.isConnected
    );
    
    return res.json({
      configured,
      connected: !!salesforcePlatform,
      platformId: salesforcePlatform?.id,
      displayName: salesforcePlatform?.displayName || "Salesforce",
      needsCredentials: !configured
    });
  } catch (error) {
    console.error("Error checking Salesforce status:", error);
    return res.status(500).json({ message: "Failed to check Salesforce status" });
  }
}

/**
 * Endpoint to connect to Salesforce via OAuth 2.0
 */
export async function connectSalesforce(req: Request, res: Response) {
  try {
    // Get user ID from session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Verify Salesforce credentials are configured
    if (!isSalesforceConfigured()) {
      return res.status(400).json({ 
        message: "Salesforce API credentials not configured. Please add SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET to your environment variables." 
      });
    }
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(20).toString('hex');
    
    // Store user ID and state in session for the callback to use
    (req.session as any).salesforceState = {
      userId,
      state
    };
    
    // Build the Salesforce authorization URL
    const authUrl = new URL('https://login.salesforce.com/services/oauth2/authorize');
    authUrl.searchParams.append('client_id', process.env.SALESFORCE_CLIENT_ID as string);
    authUrl.searchParams.append('redirect_uri', getRedirectUri(req));
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'api refresh_token offline_access');
    authUrl.searchParams.append('state', state);
    
    // Redirect user to Salesforce authorization page
    console.log(`Redirecting to Salesforce authorization: ${authUrl.toString()}`);
    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error connecting to Salesforce:", error);
    let errorMessage = "Failed to connect to Salesforce";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return res.redirect(`/app/settings?platform=salesforce&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

/**
 * Endpoint to handle Salesforce OAuth callback
 */
export async function salesforceCallback(req: Request, res: Response) {
  try {
    console.log("Received Salesforce OAuth callback");
    
    // Get code and state from query parameters
    const { code, state } = req.query;
    
    // Verify state to prevent CSRF attacks
    if (!(req.session as any)?.salesforceState || 
        (req.session as any).salesforceState.state !== state) {
      console.error("Invalid state parameter in callback");
      return res.redirect('/app/settings?platform=salesforce&status=error&error_reason=Invalid_state');
    }
    
    // Get user ID from session
    const userId = (req.session as any).salesforceState.userId;
    
    if (!code) {
      console.error("No authorization code received");
      return res.redirect('/app/settings?platform=salesforce&status=error&error_reason=Authorization_declined');
    }
    
    console.log("Exchanging authorization code for access token");
    
    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://login.salesforce.com/services/oauth2/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.SALESFORCE_CLIENT_ID,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(req),
        code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Extract token data from response
    const { 
      access_token, 
      refresh_token, 
      instance_url, 
      id, 
      issued_at, 
      expires_in = 7200 // Default to 2 hours if not provided
    } = tokenResponse.data;
    
    console.log("Successfully obtained Salesforce access token");
    console.log(`Instance URL: ${instance_url}`);
    console.log(`ID URL: ${id}`);
    
    // Calculate token expiration time
    const issuedAt = issued_at ? parseInt(issued_at) : Date.now();
    const tokenExpiry = new Date(issuedAt + (expires_in * 1000));
    
    // Get Salesforce user info
    console.log("Fetching Salesforce user information");
    const userInfoResponse = await axios.get(id, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    
    const orgName = userInfoResponse.data.organization_name || 'Salesforce Org';
    const userName = userInfoResponse.data.display_name || userInfoResponse.data.name || 'Salesforce User';
    
    console.log(`Connected to Salesforce org: ${orgName}`);
    console.log(`User: ${userName}`);
    
    // Check if user already has a Salesforce connection
    const platforms = await storage.getPlatformsByUserId(userId);
    const existingSalesforcePlatforms = platforms.filter(p => 
      p.name.toLowerCase() === "salesforce" && p.isConnected
    );
    
    // Disconnect existing Salesforce platforms first
    for (const platform of existingSalesforcePlatforms) {
      console.log(`Disconnecting existing Salesforce platform ID: ${platform.id}`);
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
    }
    
    // Store connection details in database
    console.log("Creating new Salesforce platform connection");
    const newPlatform = await storage.createPlatform({
      userId,
      name: "salesforce",
      displayName: `Salesforce (${orgName})`,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry,
      metadata: {
        instanceUrl: instance_url,
        orgId: userInfoResponse.data.organization_id,
        userId: userInfoResponse.data.user_id
      },
      isConnected: true
    });
    
    console.log(`Created Salesforce connection with ID: ${newPlatform.id}`);
    
    // Clear session data
    delete (req.session as any).salesforceState;
    
    // Redirect to settings page with success status
    return res.redirect(`/app/settings?platform=salesforce&status=connected&organization=${encodeURIComponent(orgName)}`);
  } catch (error) {
    console.error("Error in Salesforce callback:", error);
    let errorMessage = "Failed to complete Salesforce connection";
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error_description) {
      errorMessage = error.response.data.error_description;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error(`Salesforce error: ${errorMessage}`);
    return res.redirect(`/app/settings?platform=salesforce&status=error&error_reason=${encodeURIComponent(errorMessage)}`);
  }
}

/**
 * Endpoint to disconnect from Salesforce
 */
export async function disconnectSalesforce(req: Request, res: Response) {
  try {
    // Get user ID from session or use demo user
    const userId = (req.user as any)?.claims?.sub || "1";
    
    // Find all Salesforce platforms to disconnect
    const platforms = await storage.getPlatformsByUserId(userId);
    const salesforcePlatforms = platforms.filter(p => 
      p.name.toLowerCase() === "salesforce" && p.isConnected
    );
    
    if (salesforcePlatforms.length === 0) {
      return res.status(404).json({ message: "No connected Salesforce platform found" });
    }
    
    // Disconnect all matching platforms
    let disconnectedCount = 0;
    for (const platform of salesforcePlatforms) {
      console.log(`Disconnecting Salesforce platform ID: ${platform.id}`);
      
      // For each platform with a valid access token, revoke the token at Salesforce
      if (platform.accessToken && isSalesforceConfigured()) {
        try {
          const metadata = platform.metadata as any || {};
          const instanceUrl = metadata.instanceUrl || 'https://login.salesforce.com';
          
          // Attempt to revoke the token
          await axios.post(`${instanceUrl}/services/oauth2/revoke`, null, {
            params: {
              token: platform.accessToken
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          
          console.log(`Successfully revoked Salesforce token for platform ID: ${platform.id}`);
        } catch (revokeError) {
          console.error(`Error revoking Salesforce token: ${revokeError.message}`);
          // Continue with disconnection even if token revocation fails
        }
      }
      
      // Update platform status in database
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      });
      
      disconnectedCount++;
    }
    
    console.log(`Successfully disconnected ${disconnectedCount} Salesforce platforms for user ${userId}`);
    
    return res.status(200).json({ 
      success: true, 
      message: "Salesforce has been disconnected successfully" 
    });
  } catch (error) {
    console.error("Error disconnecting Salesforce:", error);
    return res.status(500).json({ message: "Failed to disconnect Salesforce" });
  }
}

/**
 * Helper function to refresh Salesforce token when expired
 */
async function refreshSalesforceToken(platform: Platform): Promise<Platform> {
  try {
    if (!platform.refreshToken) {
      throw new Error("No refresh token available");
    }
    
    const metadata = platform.metadata as any || {};
    const instanceUrl = metadata.instanceUrl || 'https://login.salesforce.com';
    
    // Exchange refresh token for new access token
    const tokenResponse = await axios.post(`${instanceUrl}/services/oauth2/token`, null, {
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.SALESFORCE_CLIENT_ID,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET,
        refresh_token: platform.refreshToken
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, expires_in = 7200 } = tokenResponse.data;
    
    // Calculate new token expiration time
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000));
    
    // Update platform with new token
    const updatedPlatform = await storage.updatePlatform(platform.id, {
      accessToken: access_token,
      tokenExpiry
    });
    
    console.log(`Refreshed Salesforce token for platform ID: ${platform.id}`);
    return updatedPlatform;
  } catch (error) {
    console.error("Error refreshing Salesforce token:", error);
    
    // Mark platform as disconnected on token refresh failure
    await storage.updatePlatform(platform.id, {
      isConnected: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null
    });
    
    throw new Error("Failed to refresh Salesforce token");
  }
}

/**
 * Check and refresh Salesforce token if needed
 */
async function getValidSalesforceToken(platform: Platform): Promise<{ token: string, instanceUrl: string }> {
  // If token is expired or will expire in the next 5 minutes, refresh it
  const now = new Date();
  const tokenExpiryTime = platform.tokenExpiry ? new Date(platform.tokenExpiry) : new Date(0);
  const expiresInMs = tokenExpiryTime.getTime() - now.getTime();
  
  if (expiresInMs < 5 * 60 * 1000) {
    console.log(`Salesforce token expired or expiring soon for platform ID: ${platform.id}`);
    const refreshedPlatform = await refreshSalesforceToken(platform);
    
    const metadata = refreshedPlatform.metadata as any || {};
    return {
      token: refreshedPlatform.accessToken,
      instanceUrl: metadata.instanceUrl || 'https://login.salesforce.com'
    };
  }
  
  const metadata = platform.metadata as any || {};
  return {
    token: platform.accessToken,
    instanceUrl: metadata.instanceUrl || 'https://login.salesforce.com'
  };
}

/**
 * Endpoint to get Salesforce accounts
 */
export async function getSalesforceAccounts(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name.toLowerCase() !== "salesforce") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "Salesforce platform is not connected" });
    }
    
    // Get valid access token (refreshing if needed)
    const { token, instanceUrl } = await getValidSalesforceToken(platform);
    
    // Fetch Salesforce API version
    const versionsResponse = await axios.get(`${instanceUrl}/services/data`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Use the latest API version
    const latestVersion = versionsResponse.data[versionsResponse.data.length - 1].version;
    console.log(`Using Salesforce API version: ${latestVersion}`);
    
    // Fetch accounts from Salesforce
    const accountsResponse = await axios.get(
      `${instanceUrl}/services/data/v${latestVersion}/sobjects/Account/recently`, 
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    // Return the accounts data
    return res.json(accountsResponse.data);
  } catch (error) {
    console.error("Error fetching Salesforce accounts:", error);
    
    // Handle token errors
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: "Salesforce authentication failed. Please reconnect your account." 
      });
    }
    
    return res.status(500).json({ 
      message: "Error fetching data from Salesforce API",
      error: error.response?.data?.message || error.message
    });
  }
}

/**
 * Endpoint to get Salesforce leads
 */
export async function getSalesforceLeads(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name.toLowerCase() !== "salesforce") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "Salesforce platform is not connected" });
    }
    
    // Get valid access token (refreshing if needed)
    const { token, instanceUrl } = await getValidSalesforceToken(platform);
    
    // Fetch Salesforce API version
    const versionsResponse = await axios.get(`${instanceUrl}/services/data`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Use the latest API version
    const latestVersion = versionsResponse.data[versionsResponse.data.length - 1].version;
    
    // Fetch leads from Salesforce
    const leadsResponse = await axios.get(
      `${instanceUrl}/services/data/v${latestVersion}/sobjects/Lead/recently`, 
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    // Return the leads data
    return res.json(leadsResponse.data);
  } catch (error) {
    console.error("Error fetching Salesforce leads:", error);
    
    // Handle token errors
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: "Salesforce authentication failed. Please reconnect your account." 
      });
    }
    
    return res.status(500).json({ 
      message: "Error fetching data from Salesforce API",
      error: error.response?.data?.message || error.message
    });
  }
}

/**
 * Endpoint to create a Salesforce lead
 */
export async function createSalesforceLead(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    const { firstName, lastName, email, phone, company, status } = req.body;
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name.toLowerCase() !== "salesforce") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "Salesforce platform is not connected" });
    }
    
    // Validate required fields
    if (!lastName) {
      return res.status(400).json({ message: "Last name is required" });
    }
    
    // Get valid access token (refreshing if needed)
    const { token, instanceUrl } = await getValidSalesforceToken(platform);
    
    // Fetch Salesforce API version
    const versionsResponse = await axios.get(`${instanceUrl}/services/data`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Use the latest API version
    const latestVersion = versionsResponse.data[versionsResponse.data.length - 1].version;
    
    // Create lead in Salesforce
    const leadResponse = await axios.post(
      `${instanceUrl}/services/data/v${latestVersion}/sobjects/Lead`, 
      {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: phone,
        Company: company || 'Unknown',
        Status: status || 'Open - Not Contacted'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Fetch the created lead
    if (leadResponse.data.success) {
      const newLeadId = leadResponse.data.id;
      const newLeadResponse = await axios.get(
        `${instanceUrl}/services/data/v${latestVersion}/sobjects/Lead/${newLeadId}`, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return res.json(newLeadResponse.data);
    }
    
    return res.json(leadResponse.data);
  } catch (error) {
    console.error("Error creating Salesforce lead:", error);
    
    // Handle token errors
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: "Salesforce authentication failed. Please reconnect your account." 
      });
    }
    
    return res.status(500).json({ 
      message: "Error creating lead in Salesforce API",
      error: error.response?.data?.message || error.message
    });
  }
}

/**
 * Endpoint to get Salesforce opportunities
 */
export async function getSalesforceOpportunities(req: Request, res: Response) {
  try {
    const platformId = parseInt(req.params.platformId);
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform) {
      return res.status(404).json({ message: "Platform not found" });
    }
    
    if (platform.name.toLowerCase() !== "salesforce") {
      return res.status(400).json({ message: "Invalid platform type" });
    }
    
    if (!platform.isConnected) {
      return res.status(400).json({ message: "Salesforce platform is not connected" });
    }
    
    // Get valid access token (refreshing if needed)
    const { token, instanceUrl } = await getValidSalesforceToken(platform);
    
    // Fetch Salesforce API version
    const versionsResponse = await axios.get(`${instanceUrl}/services/data`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Use the latest API version
    const latestVersion = versionsResponse.data[versionsResponse.data.length - 1].version;
    
    // Fetch opportunities from Salesforce
    const opportunitiesResponse = await axios.get(
      `${instanceUrl}/services/data/v${latestVersion}/sobjects/Opportunity/recently`, 
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    // Return the opportunities data
    return res.json(opportunitiesResponse.data);
  } catch (error) {
    console.error("Error fetching Salesforce opportunities:", error);
    
    // Handle token errors
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: "Salesforce authentication failed. Please reconnect your account." 
      });
    }
    
    return res.status(500).json({ 
      message: "Error fetching data from Salesforce API",
      error: error.response?.data?.message || error.message
    });
  }
}