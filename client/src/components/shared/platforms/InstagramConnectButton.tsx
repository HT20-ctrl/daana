import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiInstagram } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface InstagramConnectButtonProps {
  onConnect?: () => void;
  platform?: any; // Platform data if available from parent component
  showDisconnect?: boolean; // Whether to show the disconnect button
  className?: string;
}

export default function InstagramConnectButton({ 
  onConnect, 
  platform, 
  showDisconnect = false, 
  className 
}: InstagramConnectButtonProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check if the user just came back from Instagram OAuth flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const igConnected = params.get('ig_connected');
    
    if (igConnected === 'true') {
      toast({
        title: "Instagram connected!",
        description: "Your Instagram account has been successfully connected.",
      });
      
      // Refresh platforms data
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (onConnect) {
        onConnect();
      }
    }
  }, [location, toast, onConnect]);

  // State for tracking connection status
  const [isConnected, setIsConnected] = useState(false);

  // Check if Instagram API is configured and connected on the backend
  useEffect(() => {
    const checkInstagramStatus = async () => {
      try {
        const response = await apiRequest("GET", "/api/platforms/instagram/status");
        setIsConfigured(!!response.configured);
        setIsConnected(!!response.connected);
      } catch (error) {
        console.error("Error checking Instagram configuration:", error);
        setIsConfigured(false);
        setIsConnected(false);
      }
    };
    
    // Check status when component mounts and when platforms change
    checkInstagramStatus();
    
    // Set up polling to check status every 2 seconds to keep UI in sync
    const statusInterval = setInterval(checkInstagramStatus, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(statusInterval);
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Redirect to the Instagram connect endpoint
      window.location.href = "/api/platforms/instagram/connect";
    } catch (error) {
      console.error("Error connecting to Instagram:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to Instagram. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!platform?.id) {
      console.error("Cannot disconnect Instagram: platform ID is missing");
      return;
    }
    
    setIsDisconnecting(true);
    
    try {
      // Make DELETE request to the API endpoint
      await apiRequest("DELETE", `/api/platforms/${platform.id}`);
      
      // Show success message
      toast({
        title: "Instagram disconnected",
        description: "Your Instagram account has been successfully disconnected.",
      });
      
      // Refresh platform data
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platforms/instagram/status"] });
      
      setIsConnected(false);
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      toast({
        title: "Disconnection failed",
        description: "Failed to disconnect your Instagram account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // If we don't know if Instagram is configured yet, return a loading button
  if (isConfigured === null) {
    return (
      <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
        <SiInstagram className="text-pink-600" />
        <span>Checking...</span>
      </Button>
    );
  }

  // If Instagram is connected and we need to show the disconnect button
  if (isConnected && showDisconnect) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 bg-red-50 border-red-200 hover:bg-red-100 ${className}`}
        onClick={handleDisconnect}
        disabled={isDisconnecting}
      >
        <SiInstagram className="text-pink-600" />
        <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
      </Button>
    );
  }

  // If Instagram is connected, show "Connected" status
  if (isConnected) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 bg-green-50 border-green-200 ${className}`}
        disabled
      >
        <SiInstagram className="text-pink-600" />
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Connected
        </span>
      </Button>
    );
  }

  // If Instagram API credentials are not configured, show a button that will prompt for credentials
  if (!isConfigured) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          toast({
            title: "Instagram API credentials needed",
            description: "Instagram requires Facebook API credentials to connect. Please provide FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.",
          });
        }}
      >
        <SiInstagram className="text-pink-600" />
        <span>Connect Instagram</span>
      </Button>
    );
  }

  // If Instagram API is configured but not connected, show a connect button
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleConnect}
      disabled={isLoading}
    >
      <SiInstagram className="text-pink-600" />
      <span>{isLoading ? "Connecting..." : "Connect Instagram"}</span>
    </Button>
  );
}