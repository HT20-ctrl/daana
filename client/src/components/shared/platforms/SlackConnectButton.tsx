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
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Create a unique ID for this component to be found by the sidebar
  const connectButtonId = "connect-slack-button";

  // Check if the user just came back from Slack connection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackConnected = params.get('slack_connected');
    const slackError = params.get('slack_error');
    
    if (slackConnected === 'true') {
      toast({
        title: "Slack connected!",
        description: "Your Slack workspace has been successfully connected.",
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
    else if (slackError === 'true') {
      toast({
        title: "Connection failed",
        description: "Could not connect to Slack. Please try again.",
        variant: "destructive",
      });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location, toast, onConnect]);

  // Check if Slack API is configured and connected on the backend
  useEffect(() => {
    const checkSlackStatus = async () => {
      try {
        const response = await fetch("/api/platforms/slack/status");
        if (response.ok) {
          const data = await response.json();
          setIsConfigured(!!data.configured);
          setIsConnected(!!data.connected);
        } else {
          console.error("Error checking Slack configuration: status", response.status);
          setIsConfigured(false);
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Error checking Slack configuration:", error);
        setIsConfigured(false);
        setIsConnected(false);
      }
    };
    
    // Check status when component mounts and when platforms change
    checkSlackStatus();
    
    // Set up polling to check status every 2 seconds
    const statusInterval = setInterval(checkSlackStatus, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(statusInterval);
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
      <div id={connectButtonId}>
        <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
          <SiSlack className="text-purple-600" />
          <span>Checking...</span>
        </Button>
      </div>
    );
  }

  // If Slack is already connected, show a connected button
  if (isConnected) {
    return (
      <div id={connectButtonId}>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 bg-green-50 border-green-200 ${className}`}
          disabled={true}
        >
          <SiSlack className="text-purple-600" />
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Connected
          </span>
        </Button>
      </div>
    );
  }

  // If Slack API is configured, show a direct connect button
  return (
    <div id={connectButtonId}>
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={handleConnect}
        disabled={isLoading}
      >
        <SiSlack className="text-purple-600" />
        <span>{isLoading ? "Connecting..." : "Connect Slack"}</span>
      </Button>
    </div>
  );
}