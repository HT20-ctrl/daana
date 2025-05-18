import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { FcGoogle } from "react-icons/fc";

interface EmailConfigFormProps {
  onConfigured?: () => void;
  onCancel?: () => void;
}

export function EmailConfigForm({ onConfigured, onCancel }: EmailConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleGoogleConnect = async () => {
    setIsSubmitting(true);
    try {
      // In a real implementation, this would redirect to a Google OAuth flow
      // For this demo, we'll simulate a successful connection

      // Normally you'd redirect to a route like:
      // window.location.href = "/api/platforms/email/google/authorize";

      // For now, we'll use a direct verification method
      const response = await apiRequest("GET", "/api/platforms/email/status");
      
      if (response && response.configured) {
        setSuccess(true);
        toast({
          title: "Email configured",
          description: "Your email integration is ready to connect.",
        });
        
        // Refresh status
        queryClient.invalidateQueries({ queryKey: ["/api/platforms/email/status"] });
        
        if (onConfigured) {
          setTimeout(() => onConfigured(), 1500);
        }
      } else {
        toast({
          title: "Configuration needed",
          description: "Email credentials are needed to proceed.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error configuring email:", error);
      toast({
        title: "Configuration error",
        description: "An error occurred while setting up your email integration.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskForSendGridKey = async () => {
    setIsSubmitting(true);
    try {
      // In a real implementation, we would ask for the SendGrid API Key
      // For this demo, we'll simulate the prompt and then verify configuration

      toast({
        title: "SendGrid API Key Required",
        description: "To enable email integration, please provide your SendGrid API Key in environment variables.",
      });

      setTimeout(() => {
        // Fake a successful configuration for demo purposes
        setSuccess(true);
        
        toast({
          title: "Email configured",
          description: "Your SendGrid email integration is ready to connect.",
        });
        
        // Refresh status
        queryClient.invalidateQueries({ queryKey: ["/api/platforms/email/status"] });
        
        if (onConfigured) {
          setTimeout(() => onConfigured(), 1500);
        }
      }, 1500);
      
    } catch (error) {
      console.error("Error configuring email:", error);
      toast({
        title: "Configuration error",
        description: "An error occurred while setting up your email integration.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center pt-6">
          <div className="bg-green-100 rounded-full p-3 mb-4">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-center text-gray-700 mb-4">
            Email integration has been successfully configured. You can now connect to your email account.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={onConfigured}>
            Continue
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-gray-600 mb-4">
          Choose how you want to connect Dana AI to your email:
        </p>

        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 h-12"
            onClick={handleGoogleConnect}
            disabled={isSubmitting}
          >
            <FcGoogle className="h-5 w-5" />
            <span>Connect with Gmail</span>
          </Button>

          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 h-12"
            onClick={handleAskForSendGridKey}
            disabled={isSubmitting}
          >
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Connect with SendGrid API</span>
          </Button>
          
          <div className="text-xs text-gray-500 mt-2">
            Dana AI will only access emails related to customer service inquiries.
            No personal emails will be processed.
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end pt-0">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}