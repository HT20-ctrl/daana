import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiSlack } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import SlackConfigForm from "./SlackConfigForm";

interface SlackConnectButtonProps {
  onConnect?: () => void;
  className?: string;
}

export default function SlackConnectButton({ onConnect, className }: SlackConnectButtonProps) {
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    platformId?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
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
      
      // Refresh platforms data and refetch status
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      checkSlackStatus();
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (onConnect) {
        onConnect();
      }
    }
  }, [location, toast, onConnect]);

  // Check Slack API configuration and connection status
  const checkSlackStatus = async () => {
    try {
      const response = await apiRequest("GET", "/api/platforms/slack/status");
      setStatus({
        configured: response.configured || false,
        connected: response.connected || false,
        platformId: response.platformId
      });
    } catch (error) {
      console.error("Error checking Slack configuration:", error);
      setStatus({ configured: false, connected: false });
    }
  };

  // Initial status check
  useEffect(() => {
    checkSlackStatus();
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

  const handleDisconnect = async () => {
    if (!status?.platformId) return;
    
    setIsLoading(true);
    try {
      await apiRequest("DELETE", `/api/platforms/${status.platformId}`);
      
      toast({
        title: "Slack disconnected",
        description: "Your Slack workspace has been disconnected.",
      });
      
      // Refresh platforms data and status
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      await checkSlackStatus();
    } catch (error) {
      console.error("Error disconnecting Slack:", error);
      toast({
        title: "Disconnection failed",
        description: "Could not disconnect from Slack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If we don't know the status yet, return a loading button
  if (status === null) {
    return (
      <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
        <SiSlack className="text-purple-600" />
        <span>Checking...</span>
      </Button>
    );
  }

  // If already connected to Slack, show disconnect button
  if (status.connected) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={handleDisconnect}
        disabled={isLoading}
      >
        <SiSlack className="text-purple-600" />
        <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
        <span>{isLoading ? "Disconnecting..." : "Slack Connected"}</span>
      </Button>
    );
  }

  // If Slack API credentials are not configured, show a button that opens the config form
  if (!status.configured) {
    return (
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className={`flex items-center gap-2 ${className}`}
          >
            <SiSlack className="text-purple-600" />
            <XCircle className="w-4 h-4 text-red-500 mr-1" />
            <span>Configure Slack</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <SlackConfigForm 
            onConfigured={() => {
              setShowConfigDialog(false);
              checkSlackStatus();
            }}
            onCancel={() => setShowConfigDialog(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // If Slack API is configured but not connected, show connect button
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