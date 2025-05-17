import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiInstagram } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface InstagramConnectButtonProps {
  onConnect?: () => void;
  className?: string;
}

export default function InstagramConnectButton({ onConnect, className }: InstagramConnectButtonProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
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
      
      // Refresh platforms data
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (onConnect) {
        onConnect();
      }
    }
  }, [location, toast, onConnect]);

  // Check if Instagram API is configured on the backend
  useEffect(() => {
    const checkInstagramConfig = async () => {
      try {
        const response = await apiRequest("GET", "/api/platforms/instagram/status");
        setIsConfigured(response.configured);
      } catch (error) {
        console.error("Error checking Instagram configuration:", error);
        setIsConfigured(false);
      }
    };
    
    checkInstagramConfig();
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

  // If we don't know if Instagram is configured yet, return a loading button
  if (isConfigured === null) {
    return (
      <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
        <SiInstagram className="text-pink-600" />
        <span>Checking...</span>
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
            description: "Please provide Instagram API credentials to connect to Instagram.",
          });
        }}
      >
        <SiInstagram className="text-pink-600" />
        <span>Connect Instagram</span>
      </Button>
    );
  }

  // If Instagram API is configured, show a direct connect button
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