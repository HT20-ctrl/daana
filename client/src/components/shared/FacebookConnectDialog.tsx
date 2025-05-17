import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FaFacebook } from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface FacebookConnectDialogProps {
  trigger?: React.ReactNode;
}

export default function FacebookConnectDialog({ trigger }: FacebookConnectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Redirect to Facebook OAuth page
      // The URL will be constructed by the backend
      window.location.href = "/api/platforms/facebook/connect";
    } catch (error) {
      console.error("Error connecting to Facebook:", error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to Facebook. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <FaFacebook className="text-blue-600" />
            Connect Facebook
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect to Facebook</DialogTitle>
          <DialogDescription>
            Connect your Facebook accounts to manage messages and comments from your business pages and profiles.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Connecting to Facebook will allow Dana AI to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500">
              <li>Access and respond to messages from your business pages</li>
              <li>Read and respond to comments on your posts</li>
              <li>Manage customer conversations</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              Your credentials will be securely stored and used only for communication with Facebook.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? "Connecting..." : "Connect to Facebook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}