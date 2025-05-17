import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface EmailConnectButtonProps {
  onConnect?: () => void;
  className?: string;
}

export default function EmailConnectButton({ onConnect, className }: EmailConnectButtonProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check if the user just came back from Email setup flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailConnected = params.get('email_connected');
    
    if (emailConnected === 'true') {
      toast({
        title: "Email integration connected!",
        description: "Your email account has been successfully connected.",
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

  // Check if Email API is configured on the backend
  useEffect(() => {
    const checkEmailConfig = async () => {
      try {
        const response = await apiRequest("GET", "/api/platforms/email/status");
        setIsConfigured(response.configured);
      } catch (error) {
        console.error("Error checking Email configuration:", error);
        setIsConfigured(false);
      }
    };
    
    checkEmailConfig();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Redirect to the Email connect endpoint
      window.location.href = "/api/platforms/email/connect";
    } catch (error) {
      console.error("Error connecting to Email:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect email integration. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // If we don't know if Email is configured yet, return a loading button
  if (isConfigured === null) {
    return (
      <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
        <Mail className="text-blue-600 h-4 w-4" />
        <span>Checking...</span>
      </Button>
    );
  }

  // If Email API credentials are not configured, show a button that will prompt for credentials
  if (!isConfigured) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          toast({
            title: "Email credentials needed",
            description: "Please provide SendGrid API key to connect email integration.",
          });
        }}
      >
        <Mail className="text-blue-600 h-4 w-4" />
        <span>Connect Email</span>
      </Button>
    );
  }

  // If Email API is configured, show a direct connect button
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleConnect}
      disabled={isLoading}
    >
      <Mail className="text-blue-600 h-4 w-4" />
      <span>{isLoading ? "Connecting..." : "Connect Email"}</span>
    </Button>
  );
}