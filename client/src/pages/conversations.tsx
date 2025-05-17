import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Conversation } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Filter, 
  MessageSquare,
  Clock,
  Bot
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Conversations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  // Filter conversations based on active tab
  const getFilteredConversations = () => {
    if (!conversations) return [];
    
    // First apply search filter if any
    let filtered = conversations;
    if (searchQuery) {
      filtered = filtered.filter(conv => 
        conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Then apply tab filter
    if (activeTab === "all") return filtered;
    if (activeTab === "facebook") return filtered.filter(conv => conv.platformId === 1);
    if (activeTab === "instagram") return filtered.filter(conv => conv.platformId === 2);
    if (activeTab === "whatsapp") return filtered.filter(conv => conv.platformId === 3);
    
    return filtered;
  };

  // Helper function to generate relative time
  const getRelativeTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Helper function to get platform icon
  const getPlatformIcon = (platformId?: number) => {
    switch (platformId) {
      case 1:
        return <SiFacebook className="h-5 w-5 text-blue-600" />;
      case 2:
        return <SiInstagram className="h-5 w-5 text-pink-600" />;
      case 3:
        return <SiWhatsapp className="h-5 w-5 text-green-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  // Generate AI response
  const handleGenerateAiResponse = async (conversationId: number) => {
    try {
      await apiRequest("POST", `/api/ai/generate`, {
        conversationId,
        message: "Please generate a response"
      });
      
      toast({
        title: "AI response generated",
        description: "Response has been sent to the customer",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI response",
        variant: "destructive"
      });
      console.error("Error generating AI response:", error);
    }
  };

  const filteredConversations = getFilteredConversations();

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
            <p className="mt-1 text-sm text-gray-600">Manage all your customer conversations across platforms.</p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <form onSubmit={handleSearch} className="w-full md:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="default" asChild>
                <Link href="/conversations/new">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Conversation
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                <MessageSquare className="h-4 w-4 mr-2" />
                All
              </TabsTrigger>
              <TabsTrigger value="facebook">
                <SiFacebook className="h-4 w-4 mr-2 text-blue-600" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="instagram">
                <SiInstagram className="h-4 w-4 mr-2 text-pink-600" />
                Instagram
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <SiWhatsapp className="h-4 w-4 mr-2 text-green-500" />
                WhatsApp
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              {renderConversationList(filteredConversations)}
            </TabsContent>
            <TabsContent value="facebook" className="mt-6">
              {renderConversationList(filteredConversations)}
            </TabsContent>
            <TabsContent value="instagram" className="mt-6">
              {renderConversationList(filteredConversations)}
            </TabsContent>
            <TabsContent value="whatsapp" className="mt-6">
              {renderConversationList(filteredConversations)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
        </div>
      )}
    </>
  );

  function renderConversationList(conversations: Conversation[]) {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
        </div>
      );
    }

    if (!conversations.length) {
      return (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No conversations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery 
              ? `No results found for "${searchQuery}"`
              : "Start connecting platforms to receive messages."}
          </p>
          <Button className="mt-4" asChild>
            <Link href="/settings">Connect Platforms</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="py-4 flex justify-between items-start">
            <div className="flex items-start flex-1 min-w-0">
              <div className="flex-shrink-0">
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src={conversation.customerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.customerName)}`}
                  alt={`${conversation.customerName}'s profile`}
                />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-medium text-gray-900 truncate">{conversation.customerName}</h4>
                  <div className="flex items-center ml-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {getRelativeTime(conversation.lastMessageAt)}
                    </div>
                    <div className="ml-2">
                      {getPlatformIcon(conversation.platformId)}
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                <div className="mt-2 flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-primary-100 hover:bg-primary-200 text-primary-700 border-transparent"
                    onClick={() => handleGenerateAiResponse(conversation.id)}
                  >
                    <Bot className="h-3 w-3 mr-1" /> AI Response
                  </Button>
                  <Link href={`/conversations/${conversation.id}`}>
                    <Button size="sm" variant="outline">Reply</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
}
