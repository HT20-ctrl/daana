import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiSlack } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface SlackConnectButtonProps {
  onConnect?: () => void;
  className?: string;
}

export default function SlackConnectButton({ onConnect, className }: SlackConnectButtonProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check if the user just came back from Slack OAuth flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackConnected = params.get('slack_connected');
    
    if (slackConnected === 'true') {
      toast({
        title: "Slack connected!",
        description: "Your Slack workspace has been successfully connected.",
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

  // Check if Slack API is configured on the backend
  useEffect(() => {
    const checkSlackConfig = async () => {
      try {
        const response = await apiRequest("GET", "/api/platforms/slack/status");
        setIsConfigured(response.configured);
      } catch (error) {
        console.error("Error checking Slack configuration:", error);
        setIsConfigured(false);
      }
    };
    
    checkSlackConfig();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Redirect to the Slack connect endpoint
      window.location.href = "/api/platforms/slack/connect";
    } catch (error) {
      console.error("Error connecting to Slack:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to Slack. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // If we don't know if Slack is configured yet, return a loading button
  if (isConfigured === null) {
    return (
      <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
        <SiSlack className="text-purple-600" />
        <span>Checking...</span>
      </Button>
    );
  }

  // If Slack API credentials are not configured, show a button that will prompt for credentials
  if (!isConfigured) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          toast({
            title: "Slack API credentials needed",
            description: "Please provide Slack Bot Token and Channel ID to connect to Slack.",
          });
        }}
      >
        <SiSlack className="text-purple-600" />
        <span>Connect Slack</span>
      </Button>
    );
  }

  // If Slack API is configured, show a direct connect button
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleConnect}
      disabled={isLoading}
    >
      <SiSlack className="text-purple-600" />
      <span>{isLoading ? "Connecting..." : "Connect Slack"}</span>
    </Button>
  );
}