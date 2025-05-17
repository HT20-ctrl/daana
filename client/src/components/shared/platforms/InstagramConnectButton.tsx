import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiInstagram } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface InstagramConnectButtonProps {
  onConnect?: () => void;
  platform?: any;
  showDisconnect?: boolean;
  className?: string;
}

export default function InstagramConnectButton({ 
  onConnect, 
  platform, 
  showDisconnect = false, 
  className 
}: InstagramConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
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
      
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (onConnect) {
        onConnect();
      }
    }
  }, [location, toast, onConnect]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
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
      return;
    }
    
    setIsLoading(true);
    
    try {
      await apiRequest("DELETE", `/api/platforms/${platform.id}`);
      
      toast({
        title: "Instagram disconnected",
        description: "Your Instagram account has been successfully disconnected.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      toast({
        title: "Disconnection failed",
        description: "Failed to disconnect your Instagram account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If platform is provided and we want to show disconnect
  if (platform && showDisconnect) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 bg-red-50 border-red-200 hover:bg-red-100 ${className}`}
        onClick={handleDisconnect}
        disabled={isLoading}
      >
        <SiInstagram className="text-pink-600" />
        <span>{isLoading ? "Disconnecting..." : "Disconnect"}</span>
      </Button>
    );
  }
  
  // Default connect button
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