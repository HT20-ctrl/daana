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
    const fbError = params.get('fb_error');
    const errorReason = params.get('error_reason');
    const mockMode = params.get('mock');
    
    if (fbConnected === 'true') {
      toast({
        title: "Facebook connected!",
        description: mockMode === 'true' 
          ? "Your Facebook account has been connected in demo mode." 
          : "Your Facebook account has been successfully connected.",
        variant: "default"
      });
      
      // Refresh platforms data
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (onConnect) {
        onConnect();
      }
    } 
    else if (fbError === 'true') {
      let errorMessage = "Could not connect to Facebook. Please try again.";
      
      // Provide more specific error messages based on the error reason
      if (errorReason === 'token_exchange') {
        errorMessage = "Authentication failed. Please try connecting again.";
      } else if (errorReason === 'user_data') {
        errorMessage = "Could not retrieve user information from Facebook.";
      } else if (errorReason === 'session_expired') {
        errorMessage = "Your session expired. Please try again.";
      }
      
      toast({
        title: "Connection failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
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

  // If Facebook API credentials are not configured, we'll use mock mode
  // In a production environment, this would check if Facebook credentials are properly set up
  if (!isConfigured) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={handleConnect} // Use handle connect anyway which will set up a demo connection
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