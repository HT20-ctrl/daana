import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SiSlack } from "react-icons/si";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Check, AlertCircle } from "lucide-react";

interface SlackConfigFormProps {
  onConfigured?: () => void;
  onCancel?: () => void;
}

export default function SlackConfigForm({ onConfigured, onCancel }: SlackConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // The Slack credentials have already been set via the ask_secrets tool
      // Now we'll verify them by calling our API
      const response = await apiRequest("GET", "/api/platforms/slack/status");
      
      if (response && response.configured) {
        setSuccess(true);
        toast({
          title: "Slack credentials verified",
          description: "Your Slack workspace can now be connected.",
        });
        
        // Refresh Slack status
        queryClient.invalidateQueries({ queryKey: ["/api/platforms/slack/status"] });
        
        if (onConfigured) {
          setTimeout(() => onConfigured(), 1500);
        }
      } else {
        toast({
          title: "Verification failed",
          description: "Could not verify Slack credentials. Please check that they are correct.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying Slack credentials:", error);
      toast({
        title: "Verification error",
        description: "An error occurred while verifying your Slack credentials.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-xl">
            <SiSlack className="text-purple-600 mr-2 h-6 w-6" />
            Slack Configured!
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="bg-green-100 rounded-full p-3 mb-4">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-center text-gray-700">
            Your Slack API credentials have been successfully verified. You can now connect your Slack workspace.
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-center mb-2">
          <SiSlack className="text-purple-600 h-8 w-8" />
        </div>
        <CardTitle className="text-center text-xl">Slack Integration</CardTitle>
        <CardDescription className="text-center">
          Your Slack Bot Token and Channel ID have been securely saved. Click Verify to confirm they work correctly.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                Your credentials have been stored securely as environment variables and are not visible in the application code.
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify Credentials"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}