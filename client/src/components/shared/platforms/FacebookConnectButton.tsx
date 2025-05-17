import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiFacebook } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface FacebookConnectButtonProps {
  onConnect?: () => void;
  className?: string;
}

export default function FacebookConnectButton({ onConnect, className }: FacebookConnectButtonProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check if the user just came back from Facebook OAuth flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fbConnected = params.get('fb_connected');
    
    if (fbConnected === 'true') {
      toast({
        title: "Facebook connected!",
        description: "Your Facebook account has been successfully connected.",
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

  // Check if Facebook API is configured on the backend
  useEffect(() => {
    const checkFacebookConfig = async () => {
      try {
        const response = await apiRequest("GET", "/api/platforms/facebook/status");
        setIsConfigured(response.configured);
      } catch (error) {
        console.error("Error checking Facebook configuration:", error);
        setIsConfigured(false);
      }
    };
    
    checkFacebookConfig();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Redirect to the Facebook connect endpoint
      window.location.href = "/api/platforms/facebook/connect";
    } catch (error) {
      console.error("Error connecting to Facebook:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to Facebook. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // If we don't know if Facebook is configured yet, return a loading button
  if (isConfigured === null) {
    return (
      <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
        <SiFacebook className="text-blue-600" />
        <span>Checking...</span>
      </Button>
    );
  }

  // If Facebook API credentials are not configured, show a button that will prompt for credentials
  if (!isConfigured) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          toast({
            title: "Facebook API credentials needed",
            description: "Please provide Facebook API credentials to connect to Facebook.",
          });
        }}
      >
        <SiFacebook className="text-blue-600" />
        <span>Connect Facebook</span>
      </Button>
    );
  }

  // If Facebook API is configured, show a direct connect button
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleConnect}
      disabled={isLoading}
    >
      <SiFacebook className="text-blue-600" />
      <span>{isLoading ? "Connecting..." : "Connect Facebook"}</span>
    </Button>
  );
}