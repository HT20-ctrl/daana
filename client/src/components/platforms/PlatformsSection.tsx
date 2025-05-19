import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from '@shared/schema';
import { Card, CardContent } from "@/components/ui/card";
import { PlatformCard } from './PlatformCard';
import { PlatformConnectDialog } from './PlatformConnectDialog';

interface PlatformsSectionProps {
  title: string;
  description?: string;
  platformTypes: string[];
  className?: string;
}

export function PlatformsSection({
  title,
  description,
  platformTypes,
  className = ""
}: PlatformsSectionProps) {
  const queryClient = useQueryClient();
  
  // Fetch platforms
  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  
  // Handle platform changes
  const handlePlatformChange = () => {
    // Invalidate platform data
    queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
  };
  
  // Find platform by name
  const findPlatform = (name: string) => {
    return platforms.find(p => p.name.toLowerCase() === name.toLowerCase());
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        
        <PlatformConnectDialog 
          trigger={
            <Card className="bg-gray-50 border border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
              <CardContent className="p-2 flex items-center justify-center gap-2">
                <span className="text-gray-500 text-sm font-medium">+ Add Platform</span>
              </CardContent>
            </Card>
          }
          showSocialOnly={platformTypes.includes('facebook')} // Only show social platforms in social section
          showBusinessOnly={platformTypes.includes('slack')} // Only show business platforms in business section
        />
      </div>
      
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platformTypes.map(platformType => (
          <PlatformCard
            key={platformType}
            platformType={platformType as any}
            platform={findPlatform(platformType)}
            onConnected={handlePlatformChange}
            onDisconnected={handlePlatformChange}
          />
        ))}
      </div>
    </div>
  );
}