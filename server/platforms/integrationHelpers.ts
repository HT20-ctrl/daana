/**
 * Helper functions to check if platform credentials are configured
 */

export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_CHANNEL_ID;
}

export function isEmailConfigured(): boolean {
  return !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;
}

export function isFacebookConfigured(): boolean {
  return !!process.env.FACEBOOK_APP_ID && !!process.env.FACEBOOK_APP_SECRET;
}

export function isInstagramConfigured(): boolean {
  // Instagram uses Facebook API credentials
  return isFacebookConfigured();
}

export function isWhatsAppConfigured(): boolean {
  // This would check for WhatsApp Business API credentials
  return false; // Not implemented yet
}

export function isHubSpotConfigured(): boolean {
  // This would check for HubSpot API credentials
  return false; // Not implemented yet
}

export function isSalesforceConfigured(): boolean {
  // This would check for Salesforce API credentials
  return false; // Not implemented yet
}

/**
 * Format a redirect URI for OAuth callbacks
 */
export function getRedirectUri(req: any, platform: string): string {
  return `${req.protocol}://${req.hostname}/api/platforms/${platform}/callback`;
}