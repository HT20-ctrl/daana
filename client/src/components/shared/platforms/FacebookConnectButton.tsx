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
  
  // Create a unique ID for this component to be found by the sidebar
  const connectButtonId = "connect-facebook-button";

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

  // State for tracking connection status
  const [isConnected, setIsConnected] = useState(false);
  
  // Check if Facebook API is configured and connected on the backend
  useEffect(() => {
    const checkFacebookStatus = async () => {
      try {
        const response = await fetch("/api/platforms/facebook/status");
        if (response.ok) {
          const data = await response.json();
          setIsConfigured(!!data.configured);
          setIsConnected(!!data.connected);
        } else {
          console.error("Error checking Facebook configuration: status", response.status);
          setIsConfigured(false);
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Error checking Facebook configuration:", error);
        setIsConfigured(false);
        setIsConnected(false);
      }
    };
    
    // Check status when component mounts and when platforms change
    checkFacebookStatus();
    
    // Set up polling to check status every 2 seconds
    const statusInterval = setInterval(checkFacebookStatus, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(statusInterval);
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
      <div id={connectButtonId}>
        <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
          <SiFacebook className="text-blue-600" />
          <span>Checking...</span>
        </Button>
      </div>
    );
  }

  // If Facebook API credentials are not configured, we'll use mock mode
  // In a production environment, this would check if Facebook credentials are properly set up
  if (!isConfigured) {
    return (
      <div id={connectButtonId}>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 ${className}`}
          onClick={handleConnect} // Use handle connect anyway which will set up a demo connection
        >
          <SiFacebook className="text-blue-600" />
          <span>Connect Facebook</span>
        </Button>
      </div>
    );
  }

  // If Facebook is already connected, show a connected button
  if (isConnected) {
    return (
      <div id={connectButtonId}>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 bg-green-50 border-green-200 ${className}`}
          disabled={true}
        >
          <SiFacebook className="text-blue-600" />
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Connected
          </span>
        </Button>
      </div>
    );
  }
  
  // If Facebook API is configured but not connected, show a connect button
  return (
    <div id={connectButtonId}>
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={handleConnect}
        disabled={isLoading}
      >
        <SiFacebook className="text-blue-600" />
        <span>{isLoading ? "Connecting..." : "Connect Facebook"}</span>
      </Button>
    </div>
  );
}