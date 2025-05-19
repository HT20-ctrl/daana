import { Request, Response } from 'express';
import { storage } from '../storage';
import { Platform } from '@shared/schema';
import { 
  isSlackConfigured, 
  isEmailConfigured,
  isFacebookConfigured,
  isInstagramConfigured,
  isWhatsAppConfigured,
  isHubSpotConfigured,
  isSalesforceConfigured
} from './integrationHelpers';

/**
 * Generic platform connection handler for platforms that don't require OAuth
 * Used for creating mock connections in development
 */
export async function handleGenericPlatformConnect(
  req: Request, 
  res: Response,
  platformName: string,
  displayName: string,
  isConfigured: boolean,
  redirectPath: string = '/settings'
) {
  try {
    // Get user ID from request (for development this is always 1)
    const userId = req.user?.claims?.sub || "1";
    
    // For development, create a mock platform
    const mockToken = `mock-${platformName}-token-${Date.now()}`;
    
    // First check if we already have this platform
    const existingPlatforms = await storage.getPlatformsByUserId(userId);
    const existing = existingPlatforms.find(
      p => p.name.toLowerCase() === platformName.toLowerCase() && p.isConnected
    );
    
    let platform: Platform;
    
    if (existing) {
      // Update existing platform
      platform = await storage.updatePlatform(existing.id, {
        accessToken: mockToken,
        isConnected: true,
        updatedAt: new Date()
      });
      console.log(`Updated existing ${platformName} connection`);
    } else {
      // Create new platform entry
      platform = await storage.createPlatform({
        userId,
        name: platformName.toLowerCase(),
        displayName,
        accessToken: mockToken,
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isConnected: true
      });
      console.log(`Created new ${platformName} connection`);
    }
    
    // Add query parameter for success message
    const successParam = `${platformName.toLowerCase()}_connected=true`;
    const redirectUrl = `${redirectPath}?${successParam}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error(`Error connecting to ${platformName}:`, error);
    return res.status(500).json({ 
      message: `Failed to connect to ${platformName}`, 
      error: error.message 
    });
  }
}

/**
 * Generic platform disconnect handler
 */
export async function handleGenericPlatformDisconnect(
  req: Request,
  res: Response,
  platformName: string
) {
  try {
    // Get user ID from request
    const userId = req.user?.claims?.sub || "1";
    
    // Find all platforms matching this name
    const existingPlatforms = await storage.getPlatformsByUserId(userId);
    const platformsToDisconnect = existingPlatforms.filter(
      p => p.name.toLowerCase() === platformName.toLowerCase() && p.isConnected
    );
    
    if (platformsToDisconnect.length === 0) {
      return res.status(404).json({ 
        message: `No connected ${platformName} found` 
      });
    }
    
    // Disconnect all matching platforms
    for (const platform of platformsToDisconnect) {
      await storage.updatePlatform(platform.id, {
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        updatedAt: new Date()
      });
      console.log(`Disconnected ${platformName} platform ID: ${platform.id}`);
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `${platformName} has been disconnected successfully` 
    });
  } catch (error) {
    console.error(`Error disconnecting ${platformName}:`, error);
    return res.status(500).json({ 
      message: `Failed to disconnect ${platformName}`, 
      error: error.message 
    });
  }
}

// Platform-specific connect handlers
export async function connectFacebookHandler(req: Request, res: Response) {
  if (!isFacebookConfigured()) {
    // Use mock connection for development
    return handleGenericPlatformConnect(
      req, 
      res, 
      'facebook', 
      'Facebook Business Page',
      false,
      '/app/settings?tab=platforms'
    );
  }
  
  // Call the real Facebook OAuth handler
  // Note: This would be implemented with actual Facebook API interaction
  // For now we'll fall back to the generic handler
  return handleGenericPlatformConnect(
    req, 
    res, 
    'facebook', 
    'Facebook Business Page',
    true,
    '/app/settings?tab=platforms'
  );
}

export async function connectInstagramHandler(req: Request, res: Response) {
  if (!isInstagramConfigured()) {
    // Use mock connection for development
    return handleGenericPlatformConnect(
      req, 
      res, 
      'instagram', 
      'Instagram Business Profile',
      false,
      '/app/settings?tab=platforms'
    );
  }
  
  // Call the real Instagram OAuth handler
  // For now we'll fall back to the generic handler
  return handleGenericPlatformConnect(
    req, 
    res, 
    'instagram', 
    'Instagram Business Profile',
    true,
    '/app/settings?tab=platforms'
  );
}

export async function connectSlackHandler(req: Request, res: Response) {
  if (!isSlackConfigured()) {
    // Use mock connection for development
    return handleGenericPlatformConnect(
      req, 
      res, 
      'slack', 
      'Slack Workspace',
      false,
      '/app/settings?tab=platforms'
    );
  }
  
  // Call the real Slack OAuth handler
  // For now we'll fall back to the generic handler
  return handleGenericPlatformConnect(
    req, 
    res, 
    'slack', 
    'Slack Workspace',
    true,
    '/app/settings?tab=platforms'
  );
}

export async function connectEmailHandler(req: Request, res: Response) {
  if (!isEmailConfigured()) {
    // Use mock connection for development
    return handleGenericPlatformConnect(
      req, 
      res, 
      'email', 
      'Gmail Account',
      false,
      '/app/settings?tab=platforms'
    );
  }
  
  // Call the real Email/Gmail OAuth handler
  // For now we'll fall back to the generic handler
  return handleGenericPlatformConnect(
    req, 
    res, 
    'email', 
    'Gmail Account',
    true,
    '/app/settings?tab=platforms'
  );
}

export async function connectHubSpotHandler(req: Request, res: Response) {
  if (!isHubSpotConfigured()) {
    // Use mock connection for development
    return handleGenericPlatformConnect(
      req, 
      res, 
      'hubspot', 
      'HubSpot CRM',
      false,
      '/app/settings?tab=platforms'
    );
  }
  
  // Call the real HubSpot OAuth handler
  // For now we'll fall back to the generic handler
  return handleGenericPlatformConnect(
    req, 
    res, 
    'hubspot', 
    'HubSpot CRM',
    true,
    '/app/settings?tab=platforms'
  );
}

export async function connectSalesforceHandler(req: Request, res: Response) {
  if (!isSalesforceConfigured()) {
    // Use mock connection for development
    return handleGenericPlatformConnect(
      req, 
      res, 
      'salesforce', 
      'Salesforce CRM',
      false,
      '/app/settings?tab=platforms'
    );
  }
  
  // Call the real Salesforce OAuth handler
  // For now we'll fall back to the generic handler
  return handleGenericPlatformConnect(
    req, 
    res, 
    'salesforce', 
    'Salesforce CRM',
    true,
    '/app/settings?tab=platforms'
  );
}

export async function connectWhatsAppHandler(req: Request, res: Response) {
  if (!isWhatsAppConfigured()) {
    // Use mock connection for development
    return handleGenericPlatformConnect(
      req, 
      res, 
      'whatsapp', 
      'WhatsApp Business',
      false,
      '/app/settings?tab=platforms'
    );
  }
  
  // Call the real WhatsApp OAuth handler
  // For now we'll fall back to the generic handler
  return handleGenericPlatformConnect(
    req, 
    res, 
    'whatsapp', 
    'WhatsApp Business',
    true,
    '/app/settings?tab=platforms'
  );
}

// Platform-specific disconnect handlers
export async function disconnectFacebookHandler(req: Request, res: Response) {
  return handleGenericPlatformDisconnect(req, res, 'facebook');
}

export async function disconnectInstagramHandler(req: Request, res: Response) {
  return handleGenericPlatformDisconnect(req, res, 'instagram');
}

export async function disconnectSlackHandler(req: Request, res: Response) {
  return handleGenericPlatformDisconnect(req, res, 'slack');
}

export async function disconnectEmailHandler(req: Request, res: Response) {
  return handleGenericPlatformDisconnect(req, res, 'email');
}

export async function disconnectHubSpotHandler(req: Request, res: Response) {
  return handleGenericPlatformDisconnect(req, res, 'hubspot');
}

export async function disconnectSalesforceHandler(req: Request, res: Response) {
  return handleGenericPlatformDisconnect(req, res, 'salesforce');
}

export async function disconnectWhatsAppHandler(req: Request, res: Response) {
  return handleGenericPlatformDisconnect(req, res, 'whatsapp');
}