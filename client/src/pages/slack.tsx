import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SlackMessaging from "@/components/messaging/SlackMessaging";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SiSlack } from "react-icons/si";
import { Loader2, AlertCircle } from "lucide-react";
import SlackConnectButton from "@/components/shared/platforms/SlackConnectButton";

export default function SlackPage() {
  const [isConnected, setIsConnected] = useState(false);

  // Check if Slack is connected
  const { data: platformStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/platforms/slack/status"],
    refetchInterval: 5000,
  });

  // Get connected platforms
  const { data: platforms, isLoading: platformsLoading } = useQuery({
    queryKey: ["/api/platforms"],
  });

  useEffect(() => {
    if (platformStatus && platformStatus.connected) {
      setIsConnected(true);
    } else if (platforms && platforms.some((p: any) => p.name === "slack" && p.isConnected)) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [platformStatus, platforms]);

  const isLoading = statusLoading || platformsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-500">Checking Slack connection...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <SiSlack className="text-purple-600 h-8 w-8 mr-2" />
        <span>Slack Integration</span>
      </h1>

      {!isConnected ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Connect to Slack</CardTitle>
            <CardDescription>
              Connect Dana AI to your Slack workspace to send and receive messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8">
              <SiSlack className="h-16 w-16 text-purple-600 mb-4" />
              <h2 className="text-xl font-medium mb-2">Connect your Slack workspace</h2>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Dana AI can help you manage customer inquiries and send automated responses directly through Slack.
              </p>
              <SlackConnectButton className="px-6" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Alert className="bg-green-50 border-green-200">
            <SiSlack className="h-4 w-4 text-green-600" />
            <AlertTitle>Connected to Slack</AlertTitle>
            <AlertDescription>
              Dana AI is connected to your Slack workspace. You can now send and receive messages.
            </AlertDescription>
          </Alert>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Channel Communication</CardTitle>
              <CardDescription>
                Send and receive messages in your connected Slack channel.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px]">
              <SlackMessaging />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}