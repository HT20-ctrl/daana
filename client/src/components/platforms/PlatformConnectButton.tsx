import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Platform } from '@shared/schema';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  SiFacebook, 
  SiInstagram, 
  SiWhatsapp,
  SiSlack,
  SiHubspot,
  SiSalesforce,
} from 'react-icons/si';
import { Mail } from 'lucide-react';

// This is the main platform configuration
// Add new platforms here when adding support
export const SUPPORTED_PLATFORMS = {
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: SiFacebook,
    iconColor: 'text-blue-600',
    description: 'Connect your Facebook page',
    connectEndpoint: '/api/platforms/facebook/connect',
    statusEndpoint: '/api/platforms/facebook/status',
    redirectAuth: true, // Uses OAuth redirect flow
  },
  instagram: {
    name: 'instagram',
    displayName: 'Instagram',
    icon: SiInstagram,
    iconColor: 'text-pink-600',
    description: 'Connect your Instagram account',
    connectEndpoint: '/api/platforms/instagram/connect',
    statusEndpoint: '/api/platforms/instagram/status',
    redirectAuth: true,
  },
  slack: {
    name: 'slack',
    displayName: 'Slack',
    icon: SiSlack,
    iconColor: 'text-purple-600',
    description: 'Connect your Slack workspace',
    connectEndpoint: '/api/platforms/slack/connect',
    statusEndpoint: '/api/platforms/slack/status',
    redirectAuth: true,
  },
  email: {
    name: 'email',
    displayName: 'Email',
    icon: Mail,
    iconColor: 'text-blue-600',
    description: 'Connect your Gmail or other email',
    connectEndpoint: '/api/platforms/email/connect',
    statusEndpoint: '/api/platforms/email/status',
    redirectAuth: true,
  },
  hubspot: {
    name: 'hubspot',
    displayName: 'HubSpot',
    icon: SiHubspot,
    iconColor: 'text-orange-600',
    description: 'Connect your HubSpot account',
    connectEndpoint: '/api/platforms/hubspot/connect',
    statusEndpoint: '/api/platforms/hubspot/status',
    redirectAuth: true,
  },
  salesforce: {
    name: 'salesforce',
    displayName: 'Salesforce',
    icon: SiSalesforce,
    iconColor: 'text-blue-700',
    description: 'Connect your Salesforce account',
    connectEndpoint: '/api/platforms/salesforce/connect',
    statusEndpoint: '/api/platforms/salesforce/status',
    redirectAuth: true,
  },
  whatsapp: {
    name: 'whatsapp',
    displayName: 'WhatsApp',
    icon: SiWhatsapp,
    iconColor: 'text-green-600',
    description: 'Connect your WhatsApp Business account',
    connectEndpoint: '/api/platforms/whatsapp/connect',
    statusEndpoint: '/api/platforms/whatsapp/status',
    redirectAuth: true,
  }
};

export type PlatformType = keyof typeof SUPPORTED_PLATFORMS;

interface PlatformConnectButtonProps {
  platform: PlatformType;
  connectedPlatform?: Platform | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  showDisconnect?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function PlatformConnectButton({
  platform,
  connectedPlatform,
  onConnect,
  onDisconnect,
  showDisconnect = false,
  className = "",
  variant = "outline",
  size = "default"
}: PlatformConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get platform configuration
  const platformConfig = SUPPORTED_PLATFORMS[platform];
  if (!platformConfig) {
    console.error(`Platform ${platform} is not supported`);
    return null;
  }
  
  const IconComponent = platformConfig.icon;
  const isConnected = !!connectedPlatform?.isConnected;
  
  // Handle connect click
  const handleConnect = async () => {
    setIsLoading(true);
    
    try {
      // If this is an OAuth/redirect-based auth platform, redirect to the connect endpoint
      if (platformConfig.redirectAuth) {
        // Set a cookie or localStorage value to remember where to return after auth
        localStorage.setItem('returnToSettings', 'true');
        window.location.href = platformConfig.connectEndpoint;
        return; // This will redirect the page
      } 
      
      // Direct API connection (simpler platforms)
      const response = await fetch(platformConfig.connectEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to connect platform');
      }
      
      // Update data
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
      
      // Show success message
      toast({
        title: 'Platform connected',
        description: `${platformConfig.displayName} has been successfully connected.`
      });
      
      // Callback if provided
      if (onConnect) {
        onConnect();
      }
    } catch (error) {
      console.error('Error connecting platform:', error);
      toast({
        title: 'Connection failed',
        description: `Unable to connect ${platformConfig.displayName}. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle disconnect click
  const handleDisconnect = async () => {
    if (!connectedPlatform) return;
    
    setIsLoading(true);
    
    try {
      // Platform-specific disconnect endpoints
      const disconnectEndpoint = `/api/platforms/${platform}/disconnect`;
      
      const response = await fetch(disconnectEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disconnect platform');
      }
      
      // Update data
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
      
      // Show success message
      toast({
        title: 'Platform disconnected',
        description: `${platformConfig.displayName} has been disconnected.`
      });
      
      // Callback if provided
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error) {
      console.error('Error disconnecting platform:', error);
      toast({
        title: 'Disconnect failed',
        description: `Unable to disconnect ${platformConfig.displayName}. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // If platform is connected and we want to show disconnect button
  if (isConnected && showDisconnect) {
    return (
      <Button 
        variant="outline" 
        size={size}
        className={`flex items-center gap-2 bg-red-50 border-red-200 hover:bg-red-100 ${className}`}
        onClick={handleDisconnect}
        disabled={isLoading}
        id={`disconnect-${platform}-button`}
      >
        <IconComponent className={platformConfig.iconColor} />
        <span>{isLoading ? "Disconnecting..." : "Disconnect"}</span>
      </Button>
    );
  }
  
  // Default connect button
  return (
    <Button 
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
      onClick={handleConnect}
      disabled={isLoading}
      id={`connect-${platform}-button`}
    >
      <IconComponent className={platformConfig.iconColor} />
      <span>{isLoading ? "Connecting..." : `Connect ${platformConfig.displayName}`}</span>
    </Button>
  );
}