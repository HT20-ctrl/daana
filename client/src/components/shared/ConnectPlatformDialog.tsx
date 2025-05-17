import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { SiFacebook, SiInstagram, SiWhatsapp, SiSlack } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface ConnectPlatformDialogProps {
  trigger?: React.ReactNode;
}

export default function ConnectPlatformDialog({ trigger }: ConnectPlatformDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const platforms = [
    { 
      id: "facebook", 
      name: "Facebook Page", 
      icon: <SiFacebook className="text-blue-600 text-xl mr-2" />,
      connectFunction: connectFacebook
    },
    { 
      id: "instagram", 
      name: "Instagram Account", 
      icon: <SiInstagram className="text-pink-600 text-xl mr-2" />,
      connectFunction: connectInstagram
    },
    { 
      id: "whatsapp", 
      name: "WhatsApp Business", 
      icon: <SiWhatsapp className="text-green-500 text-xl mr-2" />,
      connectFunction: connectWhatsapp
    },
    { 
      id: "more", 
      name: "More Platforms", 
      icon: <Link2 className="text-gray-500 text-xl mr-2" />,
      connectFunction: showMorePlatforms
    }
  ];

  async function connectFacebook() {
    setIsConnecting(true);
    try {
      await apiRequest("POST", "/api/platforms", {
        name: "facebook",
        displayName: "Facebook",
        isConnected: true
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
      toast({
        title: "Platform connected",
        description: "Facebook has been successfully connected to your account.",
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Unable to connect Facebook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }

  async function connectInstagram() {
    setIsConnecting(true);
    try {
      await apiRequest("POST", "/api/platforms", {
        name: "instagram",
        displayName: "Instagram",
        isConnected: true
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
      toast({
        title: "Platform connected",
        description: "Instagram has been successfully connected to your account.",
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Unable to connect Instagram. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }

  async function connectWhatsapp() {
    setIsConnecting(true);
    try {
      await apiRequest("POST", "/api/platforms", {
        name: "whatsapp",
        displayName: "WhatsApp",
        isConnected: true
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
      toast({
        title: "Platform connected",
        description: "WhatsApp Business has been successfully connected to your account.",
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Unable to connect WhatsApp. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }

  function showMorePlatforms() {
    toast({
      title: "Coming soon",
      description: "Additional platform integrations will be available soon.",
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="inline-flex items-center">
            <Link2 className="mr-2 h-4 w-4" />
            Connect Platform
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Social Platform</DialogTitle>
          <DialogDescription>
            Connect your social media accounts to manage all communications in one place. Dana AI will help you automate responses and track performance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-4">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant="outline"
              className="w-full justify-start"
              onClick={platform.connectFunction}
              disabled={isConnecting}
            >
              {platform.icon}
              {isConnecting ? "Connecting..." : `Connect ${platform.name}`}
            </Button>
          ))}
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
