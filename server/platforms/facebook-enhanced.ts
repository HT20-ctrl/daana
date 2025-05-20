import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import axios from 'axios';
import { createPlatformConnectionHandler, createPlatformApiHandler } from '../utils/errorHandlers';
import { ApiError, asyncHandler, logger } from '../errorHandling';
import { validate } from '../middleware/validation';
import { z } from 'zod';

// Facebook platform name for consistent error handling
const PLATFORM_NAME = 'facebook';

// Configuration check with error handling
export function isFacebookConfigured(): boolean {
  const hasAppId = !!process.env.FACEBOOK_APP_ID;
  const hasAppSecret = !!process.env.FACEBOOK_APP_SECRET;
  
  if (!hasAppId || !hasAppSecret) {
    logger.warn(`Facebook authentication is not fully configured - missing ${!hasAppId ? 'FACEBOOK_APP_ID' : ''} ${!hasAppSecret ? 'FACEBOOK_APP_SECRET' : ''}`);
    return false;
  }
  
  return true;
}

// Helper for constructing the OAuth redirect URI
const getRedirectUri = (req: Request): string => {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
  const host = req.get('host') || 'localhost:5000';
  return `${protocol}://${host}/api/platforms/facebook/callback`;
};

// Status endpoint with enhanced error handling
export const getFacebookStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check if Facebook is configured at the environment level
    const isConfigured = isFacebookConfigured();
    
    if (!isConfigured) {
      return res.json({
        connected: false,
        configured: false,
        message: 'Facebook integration is not properly configured. Contact administrator.'
      });
    }
    
    // Find all Facebook platforms for this user
    const platforms = await storage.getPlatformsByUserId(req.user?.claims?.sub);
    const facebookPlatform = platforms.find(p => p.name === PLATFORM_NAME);
    
    return res.json({
      connected: !!facebookPlatform && !!facebookPlatform.accessToken,
      configured: true,
      message: facebookPlatform 
        ? 'Facebook account connected successfully' 
        : 'Facebook API is configured but not connected'
    });
  } catch (error) {
    logger.error(`Error checking Facebook status`, { userId: req.user?.claims?.sub, error });
    throw ApiError.externalApiError('Failed to check Facebook connection status', { 
      platform: PLATFORM_NAME,
      errorMessage: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Helper to find Facebook platforms with enhanced error handling
async function findFacebookPlatforms(userId: string) {
  try {
    const platforms = await storage.getPlatformsByUserId(userId);
    return platforms.filter(p => p.name === PLATFORM_NAME);
  } catch (error) {
    logger.error(`Database error fetching Facebook platforms`, { userId, error });
    throw ApiError.databaseError('Failed to fetch Facebook platform information', {
      operation: 'getPlatformsByUserId',
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }
}

// Disconnect endpoint with error handling
export const disconnectFacebook = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.claims?.sub;
  
  try {
    const facebookPlatforms = await findFacebookPlatforms(userId);
    
    if (facebookPlatforms.length === 0) {
      return res.status(404).json({ success: false, message: 'No Facebook account to disconnect' });
    }
    
    // Update the platform to remove credentials
    for (const platform of facebookPlatforms) {
      await storage.updatePlatform(platform.id, {
        userId,
        accessToken: null,
        tokenExpiry: null,
        refreshToken: null,
        metadata: JSON.stringify({ disconnected: new Date().toISOString() })
      });
    }
    
    return res.json({ success: true, message: 'Facebook account disconnected successfully' });
  } catch (error) {
    logger.error(`Error disconnecting Facebook`, { userId, error });
    throw ApiError.databaseError('Failed to disconnect Facebook account', {
      operation: 'updatePlatform',
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }
});

// Connect endpoint - wrapped with platform connection handler
export const connectFacebook = createPlatformConnectionHandler(PLATFORM_NAME, async (req: Request, res: Response) => {
  // Skip if not properly configured
  if (!isFacebookConfigured()) {
    throw ApiError.externalApiError('Facebook API not configured', { platform: PLATFORM_NAME });
  }
  
  const redirectUri = getRedirectUri(req);
  const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${process.env.FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${req.user?.claims?.sub}` +
    `&scope=pages_manage_metadata,pages_read_engagement,pages_messaging`;
  
  res.redirect(facebookAuthUrl);
});

// Callback endpoint - wrapped with platform connection handler
export const facebookCallback = createPlatformConnectionHandler(PLATFORM_NAME, async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const userId = state as string;
  
  // Validate the state matches the authenticated user
  if (userId !== req.user?.claims?.sub) {
    throw ApiError.authorizationError('User mismatch in OAuth flow');
  }
  
  if (!code) {
    throw ApiError.validationError('Missing authorization code', { requiredParams: ['code'] });
  }
  
  try {
    // Exchange authorization code for access token
    const redirectUri = getRedirectUri(req);
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code
      }
    });
    
    const { access_token, expires_in } = tokenResponse.data;
    
    // Get user information using the token
    const userResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: { access_token, fields: 'id,name,email' }
    });
    
    const { id: fbUserId, name: fbUserName } = userResponse.data;
    
    // Find existing facebook platform or create a new one
    const platforms = await findFacebookPlatforms(userId);
    let platform = platforms.length > 0 ? platforms[0] : null;
    
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);
    
    const platformData = {
      userId,
      name: PLATFORM_NAME,
      displayName: 'Facebook',
      accessToken: access_token,
      tokenExpiry: expiryDate,
      metadata: JSON.stringify({
        fbUserId,
        fbUserName,
        connectedAt: new Date().toISOString()
      })
    };
    
    if (platform) {
      platform = await storage.updatePlatform(platform.id, platformData);
      logger.info(`Updated existing Facebook platform`, { userId, platformId: platform.id });
    } else {
      platform = await storage.createPlatform(platformData);
      logger.info(`Created new Facebook platform`, { userId, platformId: platform.id });
    }
    
    // Redirect to settings page
    res.redirect('/app/settings?platformConnected=facebook');
  } catch (error) {
    logger.error(`Error in Facebook OAuth callback`, { userId, error });
    
    // Handle specific OAuth errors
    if (axios.isAxiosError(error) && error.response) {
      throw ApiError.externalApiError(`Facebook API error: ${error.response.data.error?.message || 'Unknown error'}`, {
        platform: PLATFORM_NAME,
        statusCode: error.response.status,
        errorData: error.response.data
      });
    }
    
    throw error; // Let the platform connection handler deal with other errors
  }
});

// Message schema for validation
const sendMessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  message: z.string().min(1, 'Message content is required').max(2000, 'Message too long')
});

// Get messages endpoint - wrapped with platform API handler
export const getFacebookMessages = createPlatformApiHandler(PLATFORM_NAME, async (req: Request, res: Response) => {
  const platformId = parseInt(req.params.platformId);
  
  // Get platform details
  const platform = await storage.getPlatformById(platformId);
  
  if (!platform || platform.name !== PLATFORM_NAME) {
    throw ApiError.notFound('Facebook platform not found');
  }
  
  if (!platform.accessToken) {
    throw ApiError.authenticationError('Facebook not connected', { code: 'platform_not_connected' });
  }
  
  // This is a mock implementation - in real app, we'd call the Facebook API
  // Mock data for demonstration of error handling
  const messages = [
    {
      id: 'fb-msg-1',
      senderId: 'fb-user-123',
      senderName: 'John Smith',
      content: 'Hi there! I\'m interested in your product.',
      timestamp: new Date(),
      isRead: true
    },
    {
      id: 'fb-msg-2',
      senderId: 'fb-user-456',
      senderName: 'Sarah Johnson',
      content: 'Do you offer international shipping?',
      timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
      isRead: false
    },
    {
      id: 'fb-msg-3',
      senderId: 'fb-user-789',
      senderName: 'Michael Brown',
      content: 'What are your business hours?',
      timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
      isRead: false
    }
  ];
  
  return res.json(messages);
});

// Send message endpoint - with validation middleware and platform API handler
export const sendFacebookMessage = [
  validate(sendMessageSchema),
  createPlatformApiHandler(PLATFORM_NAME, async (req: Request, res: Response) => {
    const platformId = parseInt(req.params.platformId);
    const { recipientId, message } = req.body;
    
    // Get platform details
    const platform = await storage.getPlatformById(platformId);
    
    if (!platform || platform.name !== PLATFORM_NAME) {
      throw ApiError.notFound('Facebook platform not found');
    }
    
    if (!platform.accessToken) {
      throw ApiError.authenticationError('Facebook not connected', { code: 'platform_not_connected' });
    }
    
    // In a real implementation, we would call the Facebook API here
    logger.info(`Sending Facebook message`, { 
      platformId, 
      recipientId, 
      messageLength: message.length 
    });
    
    // Mock successful response
    return res.json({ 
      success: true, 
      messageId: `fb-${Date.now()}`,
      timestamp: new Date(),
      recipientId
    });
  })
];