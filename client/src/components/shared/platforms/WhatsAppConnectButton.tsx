import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface WhatsAppConnectButtonProps {
  onConnect?: () => void;
  className?: string;
}

export default function WhatsAppConnectButton({ onConnect, className }: WhatsAppConnectButtonProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check if the user just came back from WhatsApp OAuth flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const waConnected = params.get('wa_connected');
    
    if (waConnected === 'true') {
      toast({
        title: "WhatsApp connected!",
        description: "Your WhatsApp Business account has been successfully connected.",
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

  // Check if WhatsApp API is configured on the backend
  useEffect(() => {
    const checkWhatsAppConfig = async () => {
      try {
        const response = await apiRequest("GET", "/api/platforms/whatsapp/status");
        setIsConfigured(response.configured);
      } catch (error) {
        console.error("Error checking WhatsApp configuration:", error);
        setIsConfigured(false);
      }
    };
    
    checkWhatsAppConfig();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Redirect to the WhatsApp connect endpoint
      window.location.href = "/api/platforms/whatsapp/connect";
    } catch (error) {
      console.error("Error connecting to WhatsApp:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to WhatsApp. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // If we don't know if WhatsApp is configured yet, return a loading button
  if (isConfigured === null) {
    return (
      <Button variant="outline" className={`flex items-center gap-2 ${className}`} disabled>
        <SiWhatsapp className="text-green-600" />
        <span>Checking...</span>
      </Button>
    );
  }

  // If WhatsApp API credentials are not configured, show a button that will prompt for credentials
  if (!isConfigured) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          toast({
            title: "WhatsApp API credentials needed",
            description: "Please provide WhatsApp Business API credentials to connect to WhatsApp.",
          });
        }}
      >
        <SiWhatsapp className="text-green-600" />
        <span>Connect WhatsApp</span>
      </Button>
    );
  }

  // If WhatsApp API is configured, show a direct connect button
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleConnect}
      disabled={isLoading}
    >
      <SiWhatsapp className="text-green-600" />
      <span>{isLoading ? "Connecting..." : "Connect WhatsApp"}</span>
    </Button>
  );
}