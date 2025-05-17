import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SiSlack } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SlackMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export default function SlackMessaging() {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const { toast } = useToast();

  // Fetch messages from Slack
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/platforms/slack/messages");
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        } else {
          console.error("Error fetching Slack messages:", response.status);
          toast({
            title: "Error fetching messages",
            description: "Could not load Slack messages. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching Slack messages:", error);
        toast({
          title: "Error fetching messages",
          description: "Could not load Slack messages. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    // Set up polling to fetch new messages
    const messageInterval = setInterval(fetchMessages, 10000);
    
    return () => clearInterval(messageInterval);
  }, [toast]);

  // Send a message to Slack
  const sendMessage = async () => {
    if (!messageText.trim()) return;
    
    setIsSending(true);
    try {
      const response = await fetch("/api/platforms/slack/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText }),
      });
      
      if (response.ok) {
        setMessageText("");
        toast({
          title: "Message sent",
          description: "Your message was sent to Slack successfully.",
          variant: "default",
        });
        
        // Fetch updated messages
        const messagesResponse = await fetch("/api/platforms/slack/messages");
        if (messagesResponse.ok) {
          const data = await messagesResponse.json();
          setMessages(data);
        }
      } else {
        console.error("Error sending Slack message:", response.status);
        toast({
          title: "Error sending message",
          description: "Could not send message to Slack. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending Slack message:", error);
      toast({
        title: "Error sending message",
        description: "Could not send message to Slack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Format timestamp to readable format
  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center mb-4 p-2 bg-violet-50 rounded-lg">
        <SiSlack className="h-6 w-6 text-purple-600 mr-2" />
        <h2 className="text-lg font-semibold">Slack Messaging</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-500">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <SiSlack className="h-12 w-12 mb-2 text-gray-300" />
            <p>No messages yet.</p>
            <p className="text-sm">Send a message to start a conversation.</p>
          </div>
        ) : (
          messages.map((message) => (
            <Card 
              key={message.id} 
              className={`max-w-[85%] ${
                message.senderId === "self" 
                  ? "ml-auto bg-blue-50" 
                  : "mr-auto"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">
                    {message.senderId === "self" 
                      ? "You" 
                      : message.senderName || "Slack User"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <div className="flex space-x-2 mt-auto pt-2 border-t">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button 
          onClick={sendMessage} 
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : "Send"}
        </Button>
      </div>
    </div>
  );
}