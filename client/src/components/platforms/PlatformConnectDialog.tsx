import React, { useState } from 'react';
import { SUPPORTED_PLATFORMS, PlatformType } from './PlatformConnectButton';
import { Button } from "@/components/ui/button";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Link2 } from 'lucide-react';

interface PlatformConnectDialogProps {
  trigger?: React.ReactNode;
  onPlatformSelected?: (platform: PlatformType) => void;
  initialPlatform?: PlatformType;
  showSocialOnly?: boolean; // If true, only show social media platforms
  showBusinessOnly?: boolean; // If true, only show business/CRM platforms
}

export function PlatformConnectDialog({
  trigger,
  onPlatformSelected,
  initialPlatform,
  showSocialOnly = false,
  showBusinessOnly = false
}: PlatformConnectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter platforms based on the showType props
  const getPlatformList = () => {
    const socialPlatforms: PlatformType[] = ['facebook', 'instagram', 'whatsapp'];
    const businessPlatforms: PlatformType[] = ['slack', 'email', 'hubspot', 'salesforce'];
    
    if (showSocialOnly) {
      return Object.entries(SUPPORTED_PLATFORMS)
        .filter(([key]) => socialPlatforms.includes(key as PlatformType))
        .map(([key, config]) => ({ 
          id: key as PlatformType, 
          ...config
        }));
    }
    
    if (showBusinessOnly) {
      return Object.entries(SUPPORTED_PLATFORMS)
        .filter(([key]) => businessPlatforms.includes(key as PlatformType))
        .map(([key, config]) => ({ 
          id: key as PlatformType, 
          ...config
        }));
    }
    
    // Return all platforms by default
    return Object.entries(SUPPORTED_PLATFORMS)
      .map(([key, config]) => ({ 
        id: key as PlatformType, 
        ...config
      }));
  };

  const platformsList = getPlatformList();

  // Handle platform selection
  const handlePlatformSelect = (platformId: PlatformType) => {
    const platformConfig = SUPPORTED_PLATFORMS[platformId];
    
    // If there's a callback, call it
    if (onPlatformSelected) {
      onPlatformSelected(platformId);
    }
    
    // If it's a redirect auth platform, redirect
    if (platformConfig.redirectAuth) {
      // Store return info
      localStorage.setItem('returnToSettings', 'true');
      window.location.href = platformConfig.connectEndpoint;
      return;
    }
    
    // Close the dialog if not redirecting
    setIsOpen(false);
    
    // Show info toast
    toast({
      title: `Connecting ${platformConfig.displayName}`,
      description: `Starting connection process for ${platformConfig.displayName}...`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="inline-flex items-center">
            <Link2 className="mr-2 h-4 w-4" />
            Connect Platform
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Platform</DialogTitle>
          <DialogDescription>
            Connect your communication platforms to manage all messages in one place. Dana AI will help you automate responses and track performance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-4">
          {platformsList.map((platform) => {
            const IconComponent = platform.icon;
            
            return (
              <Button
                key={platform.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handlePlatformSelect(platform.id)}
                disabled={isConnecting}
              >
                <IconComponent className={`mr-2 ${platform.iconColor}`} />
                {isConnecting ? "Connecting..." : `Connect ${platform.displayName}`}
              </Button>
            );
          })}
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}