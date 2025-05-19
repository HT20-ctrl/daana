import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Conversation, Message } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Bot, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";

export default function ConversationDetail() {
  const [location] = useLocation();
  const conversationId = location.split('/').pop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Fetch conversation details
  const { data: conversation, isLoading: isLoadingConversation } = useQuery<Conversation>({
    queryKey: [`/api/conversations/${conversationId}`],
    enabled: !!conversationId,
  });

  // Fetch messages for this conversation
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!conversationId,
    refetchInterval: 10000, // Poll for new messages every 10 seconds
  });

  // Handle sending a reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyText.trim() || !conversationId) {
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content: replyText,
        isFromCustomer: false,
        isAiGenerated: false
      });
      
      // Refetch messages
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      
      // Clear the reply textarea
      setReplyText("");
      
      toast({
        title: "Message sent",
        description: "Your reply has been sent successfully",
      });
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Failed to send message",
        description: "There was an error sending your reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle generating AI response
  const handleGenerateAI = async () => {
    if (!conversationId) return;
    
    setIsGeneratingAI(true);
    
    try {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/ai-response`);
      
      // Refetch messages
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      
      toast({
        title: "AI response generated",
        description: "The AI response has been generated and sent",
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({
        title: "Failed to generate AI response",
        description: "There was an error generating the AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  // Get platform icon based on platformId
  const getPlatformIcon = (platformId: number | null) => {
    switch (platformId) {
      case 1:
        return <SiFacebook className="h-5 w-5 text-blue-600" />;
      case 2:
        return <SiInstagram className="h-5 w-5 text-pink-600" />;
      case 3:
        return <SiWhatsapp className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };
  
  // Get platform name based on platformId
  const getPlatformName = (platformId: number | null) => {
    switch (platformId) {
      case 1:
        return "Facebook";
      case 2:
        return "Instagram";
      case 3:
        return "WhatsApp";
      default:
        return "Unknown";
    }
  };

  if (!conversationId) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-gray-900">Conversation not found</h1>
        <p className="mt-2 text-gray-600">The conversation you're looking for doesn't exist.</p>
        <Button className="mt-4" asChild>
          <Link href="/app/conversations">Back to conversations</Link>
        </Button>
      </div>
    );
  }

  if (isLoadingConversation || isLoadingMessages) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-600">Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-gray-900">Conversation not found</h1>
        <p className="mt-2 text-gray-600">The conversation you're looking for doesn't exist.</p>
        <Button className="mt-4" asChild>
          <Link href="/app/conversations">Back to conversations</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" className="gap-1 pl-1">
          <a href="/conversations" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to conversations
          </a>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Main conversation area */}
        <div className="flex-1">
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.customerName)}`} alt={conversation.customerName} />
                    <AvatarFallback>{conversation.customerName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{conversation.customerName}</CardTitle>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      {getPlatformIcon(conversation.platformId)}
                      <span className="ml-1">{getPlatformName(conversation.platformId)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col space-y-4 mb-4" style={{ maxHeight: "500px", overflowY: "auto" }}>
                {messages && messages.length > 0 ? (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.isFromCustomer 
                            ? 'bg-gray-100 text-gray-900' 
                            : message.isAiGenerated 
                              ? 'bg-indigo-100 text-indigo-900' 
                              : 'bg-primary-100 text-primary-900'
                        }`}
                      >
                        {message.isAiGenerated && (
                          <div className="flex items-center text-xs text-indigo-600 mb-1">
                            <Bot className="h-3 w-3 mr-1" />
                            AI-generated
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div className="text-xs mt-1 text-right opacity-70">
                          {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No messages in this conversation yet.</p>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <form onSubmit={handleSendReply} className="space-y-3">
                  <Textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                    >
                      {isGeneratingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating AI response...
                        </>
                      ) : (
                        <>
                          <Bot className="h-4 w-4 mr-2" />
                          Generate AI Response
                        </>
                      )}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!replyText.trim() || isSending}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Reply
                          <Send className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Customer info sidebar */}
        <div className="w-full md:w-80">
          <Card>
            <CardHeader>
              <CardTitle>Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p>{conversation.customerName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Platform</h3>
                <div className="flex items-center">
                  {getPlatformIcon(conversation.platformId)}
                  <span className="ml-1">{getPlatformName(conversation.platformId)}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">First contacted</h3>
                <p>{conversation.createdAt && 
                   new Date(conversation.createdAt).toLocaleDateString('en-US', { 
                     year: 'numeric', 
                     month: 'long', 
                     day: 'numeric' 
                   })
                  }</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last active</h3>
                <p>{conversation.lastMessageAt && formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}