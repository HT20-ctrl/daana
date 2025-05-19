import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";
import * as React from "react";
import { useToast } from "@/hooks/use-toast";

interface RecentConversationsProps {
  conversations?: Conversation[];
  isLoading: boolean;
}

export default function RecentConversations({ conversations = [], isLoading }: RecentConversationsProps) {
  // Helper function to get appropriate icon based on platform
  const getPlatformIcon = (platformId: number | undefined | null) => {
    // Simplified for demo - in real app would check platform name
    const id = platformId || 0;
    if (id === 1) return <SiFacebook className="mr-1" />;
    if (id === 2) return <SiInstagram className="mr-1" />;
    if (id === 3) return <SiWhatsapp className="mr-1" />;
    return <SiFacebook className="mr-1" />;
  };

  // Helper function to get appropriate color based on platform
  const getPlatformColor = (platformId: number | undefined | null) => {
    const id = platformId || 0;
    if (id === 1) return "bg-blue-100 text-blue-800";
    if (id === 2) return "bg-purple-100 text-purple-800";
    if (id === 3) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  // Helper function to generate relative time
  const getRelativeTime = (date: Date | null) => {
    if (!date) return 'Unknown time';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Generate AI response
  const { toast } = useToast();
  const [generatingConversationId, setGeneratingConversationId] = React.useState<number | null>(null);
  
  const handleGenerateAiResponse = async (conversationId: number) => {
    try {
      setGeneratingConversationId(conversationId);
      
      toast({
        title: "Generating AI response...",
        description: "This may take a few seconds",
      });
      
      await apiRequest("POST", `/api/ai/generate`, {
        conversationId,
        message: "Please generate a response"
      });
      
      toast({
        title: "AI response generated",
        description: "Response has been created successfully",
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({
        title: "Error generating response",
        description: "There was an error generating the AI response",
        variant: "destructive",
      });
    } finally {
      setGeneratingConversationId(null);
    }
  };

  return (
    <Card className="shadow rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "600ms" }}>
      <CardHeader className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <CardTitle className="text-lg font-medium leading-6 text-gray-900">Recent Conversations</CardTitle>
        <a href="/conversations" className="text-sm font-medium text-primary-600 hover:text-primary-500">
          View all
        </a>
      </CardHeader>
      <div className="border-t border-gray-200 divide-y divide-gray-200">
        {isLoading ? (
          <div className="px-4 py-12 flex justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No recent conversations found.</p>
          </div>
        ) : (
          conversations.slice(0, 3).map((conversation) => (
            <div key={conversation.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center">
                <img 
                  className="h-10 w-10 rounded-full object-cover" 
                  src={conversation.customerAvatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(conversation.customerName)} 
                  alt={`${conversation.customerName}'s profile`} 
                />
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{conversation.customerName}</h4>
                    <span className="text-xs text-gray-500">{getRelativeTime(conversation.lastMessageAt)}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                </div>
                <div className="ml-2 flex-shrink-0 flex">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(conversation.platformId ?? undefined)}`}>
                    {getPlatformIcon(conversation.platformId ?? undefined)}
                    {conversation.platformId === 1 ? "Facebook" : 
                      conversation.platformId === 2 ? "Instagram" : "WhatsApp"}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex justify-end space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-primary-100 hover:bg-primary-200 text-primary-700 border-transparent"
                  onClick={() => handleGenerateAiResponse(conversation.id)}
                >
                  <Bot className="h-4 w-4 mr-1" /> AI Response
                </Button>
                <a href={`/conversations/${conversation.id}`}>
                  <Button size="sm" variant="outline">
                    Reply
                  </Button>
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
