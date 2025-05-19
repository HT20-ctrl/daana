import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Platform } from '@shared/schema';
import { CheckCircle, XCircle } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PlatformConnectButton, PlatformType, SUPPORTED_PLATFORMS } from './PlatformConnectButton';

interface PlatformCardProps {
  platformType: PlatformType;
  platform?: Platform | null;
  className?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function PlatformCard({
  platformType,
  platform,
  className = "",
  onConnected,
  onDisconnected
}: PlatformCardProps) {
  // Get platform configuration
  const platformConfig = SUPPORTED_PLATFORMS[platformType];
  if (!platformConfig) {
    console.error(`Platform ${platformType} is not supported`);
    return null;
  }
  
  const IconComponent = platformConfig.icon;
  const isConnected = !!platform?.isConnected;
  
  return (
    <Card className={`bg-gray-50 border ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <IconComponent className={`h-5 w-5 ${platformConfig.iconColor}`} />
            <div className="ml-3">
              <p className="text-sm font-medium">{platformConfig.displayName}</p>
              <div className="flex items-center mt-1">
                {isConnected ? (
                  <span className="flex items-center text-xs text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-gray-500">
                    {platformConfig.description}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {isConnected ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <PlatformConnectButton
                  platform={platformType}
                  connectedPlatform={platform}
                  showDisconnect={true}
                  size="sm"
                  onDisconnect={onDisconnected}
                />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect {platformConfig.displayName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disconnect your {platformConfig.displayName} account. You will need to reconnect to continue managing conversations from this platform.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    // The disconnect action is already handled by the button's onClick
                  }}>
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <PlatformConnectButton
              platform={platformType}
              size="sm"
              onConnect={onConnected}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}