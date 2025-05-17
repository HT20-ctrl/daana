import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function HubSpotConnectButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check if HubSpot is configured on the server
  const checkHubSpotConfiguration = async () => {
    try {
      const response = await fetch("/api/platforms/hubspot/status");
      const data = await response.json();
      setIsConfigured(data.configured);

      if (!data.configured) {
        toast({
          title: "HubSpot Not Configured",
          description: "HubSpot API key is missing. Please set the HUBSPOT_API_KEY environment variable.",
          variant: "destructive"
        });
      }
      
      return data.configured;
    } catch (error) {
      console.error("Error checking HubSpot configuration:", error);
      toast({
        title: "Error",
        description: "Could not verify HubSpot configuration",
        variant: "destructive"
      });
      return false;
    }
  };

  // Connect to HubSpot
  const connectHubSpot = async () => {
    setIsConnecting(true);
    
    try {
      // First check if HubSpot is configured on the server
      const configured = await checkHubSpotConfiguration();
      
      if (!configured) {
        setIsConnecting(false);
        return;
      }
      
      // In a real implementation, this would redirect to HubSpot's OAuth flow
      // For our simplified implementation, we'll directly call the connect endpoint
      
      const response = await apiRequest("/api/platforms/hubspot/connect", {
        method: "POST"
      });
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Connected to HubSpot successfully!",
        });
        
        // Invalidate platforms query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to connect to HubSpot",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error connecting to HubSpot:", error);
      toast({
        title: "Error",
        description: "Could not connect to HubSpot",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="text-sm"
      onClick={connectHubSpot}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : "Connect"}
    </Button>
  );
}