import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EmailConnectButtonProps {
  onConnect?: () => void;
  className?: string;
}

export default function EmailConnectButton({ onConnect, className }: EmailConnectButtonProps) {
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    platformId?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check if the user just came back from Email OAuth flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailConnected = params.get('email_connected');
    
    if (emailConnected === 'true') {
      toast({
        title: "Email connected!",
        description: "Your email account has been successfully connected.",
      });
      
      // Refresh platforms data and refetch status
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      checkEmailStatus();
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (onConnect) {
        onConnect();
      }
    }
  }, [location, toast, onConnect]);

  // Check Email API configuration and connection status
  const checkEmailStatus = async () => {
    try {
      const response = await apiRequest("GET", "/api/platforms/email/status");
      setStatus({
        configured: response.configured || false,
        connected: response.connected || false,
        platformId: response.platformId
      });
    } catch (error) {
      console.error("Error checking Email configuration:", error);
      setStatus({ configured: false, connected: false });
    }
  };

  // Initial status check
  useEffect(() => {
    checkEmailStatus();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // For Google Email OAuth, you'd typically redirect to a Google auth URL
      window.location.href = "/api/platforms/email/connect";
    } catch (error) {
      console.error("Error connecting to Email:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to Email. Please try again.",
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
        title: "Email disconnected",
        description: "Your email account has been disconnected.",
      });
      
      // Refresh platforms data and status
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      await checkEmailStatus();
    } catch (error) {
      console.error("Error disconnecting Email:", error);
      toast({
        title: "Disconnection failed",
        description: "Could not disconnect your email account. Please try again.",
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
        <Mail className="text-blue-600" />
        <span>Checking...</span>
      </Button>
    );
  }

  // If already connected to Email, show disconnect button
  if (status.connected) {
    return (
      <Button 
        variant="outline" 
        className={`flex items-center gap-2 ${className}`}
        onClick={handleDisconnect}
        disabled={isLoading}
      >
        <Mail className="text-blue-600" />
        <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
        <span>{isLoading ? "Disconnecting..." : "Email Connected"}</span>
      </Button>
    );
  }

  // If Email API credentials are not configured, show a button that opens the config form
  if (!status.configured) {
    return (
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className={`flex items-center gap-2 ${className}`}
          >
            <Mail className="text-blue-600" />
            <XCircle className="w-4 h-4 text-red-500 mr-1" />
            <span>Configure Email</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Email Integration</DialogTitle>
            <DialogDescription>
              Connect Dana AI to your email account to manage customer communications
            </DialogDescription>
          </DialogHeader>
          
          {/* Email Config Form Integrated Directly */}
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 h-12 mb-3"
                  onClick={() => {
                    toast({
                      title: "Gmail Connection",
                      description: "Redirecting to Google authentication...",
                    });
                    
                    // Redirect to our Gmail OAuth flow
                    window.location.href = "/api/platforms/email/connect?provider=gmail";
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  <span>Connect with Gmail</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full flex items-center gap-2 h-12"
                  onClick={() => {
                    toast({
                      title: "SendGrid API Key Required",
                      description: "To enable email integration with SendGrid, please add your API key to the environment variables.",
                    });
                    
                    // In a production app, this would prompt for the API key
                    setTimeout(() => {
                      setShowConfigDialog(false);
                    }, 1500);
                  }}
                >
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span>Connect with SendGrid API</span>
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 mt-2">
                Dana AI will only access emails related to customer service inquiries.
                No personal emails will be processed.
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If Email API is configured but not connected, show connect button
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleConnect}
      disabled={isLoading}
    >
      <Mail className="text-blue-600" />
      <span>{isLoading ? "Connecting..." : "Connect Email"}</span>
    </Button>
  );
}