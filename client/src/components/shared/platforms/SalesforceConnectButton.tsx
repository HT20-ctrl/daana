import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function SalesforceConnectButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check if Salesforce is configured on the server
  const checkSalesforceConfiguration = async () => {
    try {
      const response = await fetch("/api/platforms/salesforce/status");
      const data = await response.json();
      setIsConfigured(data.configured);

      if (!data.configured) {
        toast({
          title: "Salesforce Not Configured",
          description: "Salesforce API credentials are missing. Please set the SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET environment variables.",
          variant: "destructive"
        });
      }
      
      return data.configured;
    } catch (error) {
      console.error("Error checking Salesforce configuration:", error);
      toast({
        title: "Error",
        description: "Could not verify Salesforce configuration",
        variant: "destructive"
      });
      return false;
    }
  };

  // Connect to Salesforce
  const connectSalesforce = async () => {
    setIsConnecting(true);
    
    try {
      // First check if Salesforce is configured on the server
      const configured = await checkSalesforceConfiguration();
      
      if (!configured) {
        setIsConnecting(false);
        return;
      }
      
      // In a real implementation, this would redirect to Salesforce's OAuth flow
      // For our simplified implementation, we'll directly call the connect endpoint
      
      const response = await fetch("/api/platforms/salesforce/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: "Connected to Salesforce successfully!",
        });
        
        // Invalidate platforms query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to connect to Salesforce",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error connecting to Salesforce:", error);
      toast({
        title: "Error",
        description: "Could not connect to Salesforce",
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
      onClick={connectSalesforce}
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