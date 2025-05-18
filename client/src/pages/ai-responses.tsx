import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Message } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Search, 
  Filter, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  User
} from "lucide-react";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AiResponseMessage extends Message {
  customerName: string;
  platform: string;
  platformId: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'sent' | 'failed' | 'pending';
  conversationId: number;
}

export default function AiResponses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  
  // Mock query for AI-generated responses
  const { data: aiResponses, isLoading } = useQuery<AiResponseMessage[]>({
    queryKey: ["/api/messages/ai"],
  });

  // Demo data for UI display
  const demoResponses: AiResponseMessage[] = [
    {
      id: 1,
      conversationId: 1,
      content: "Thank you for reaching out! Our downtown location is open Monday-Friday from 9am to 7pm, and Saturday from 10am to 5pm. We're closed on Sundays.",
      isFromCustomer: false,
      isAiGenerated: true,
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      customerName: "Michael Chen",
      platform: "Instagram",
      platformId: 2,
      sentiment: "positive",
      status: "sent"
    },
    {
      id: 2,
      conversationId: 2,
      content: "I understand you're having trouble placing an order on our website. Could you please let me know which page you're experiencing issues with? In the meantime, I'd recommend clearing your browser cache or trying a different browser.",
      isFromCustomer: false,
      isAiGenerated: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      customerName: "Sarah Thompson",
      platform: "Facebook",
      platformId: 1,
      sentiment: "neutral",
      status: "sent"
    },
    {
      id: 3,
      conversationId: 3,
      content: "Yes, we do offer international shipping to Canada! Shipping costs depend on the package size and delivery speed you select. Would you like me to provide our shipping rates to Canada?",
      isFromCustomer: false,
      isAiGenerated: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      customerName: "Emily Rodriguez",
      platform: "WhatsApp",
      platformId: 3,
      sentiment: "positive",
      status: "sent"
    },
    {
      id: 4,
      conversationId: 4,
      content: "I apologize for the confusion regarding your order #12345. Our system shows it was shipped yesterday via UPS with tracking number ABC123XYZ. You should receive it within 3-5 business days.",
      isFromCustomer: false,
      isAiGenerated: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      customerName: "James Wilson",
      platform: "Facebook",
      platformId: 1,
      sentiment: "neutral",
      status: "sent"
    },
    {
      id: 5,
      conversationId: 5,
      content: "I'm sorry to hear about your experience. I'd like to help resolve this issue. Could you please provide more details about what happened with your product?",
      isFromCustomer: false,
      isAiGenerated: true,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      customerName: "David Johnson",
      platform: "Instagram",
      platformId: 2,
      sentiment: "negative",
      status: "failed"
    }
  ];

  // Filter responses based on active tab and search query
  const getFilteredResponses = () => {
    // Use demo data for now, would use aiResponses in production
    let filtered = demoResponses;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(response => 
        response.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        response.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply tab filter
    if (activeTab === "all") {
      // No additional filtering needed
    } else if (activeTab === "facebook") {
      filtered = filtered.filter(response => response.platformId === 1);
    } else if (activeTab === "instagram") {
      filtered = filtered.filter(response => response.platformId === 2);
    } else if (activeTab === "whatsapp") {
      filtered = filtered.filter(response => response.platformId === 3);
    }
    
    // Apply time filter
    if (timeFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(response => new Date(response.createdAt) >= today);
    } else if (timeFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(response => new Date(response.createdAt) >= weekAgo);
    } else if (timeFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(response => new Date(response.createdAt) >= monthAgo);
    }
    
    return filtered;
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the filter function
  };

  // Helper function to get platform icon
  const getPlatformIcon = (platformId: number) => {
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

  // Helper function to get sentiment icon and color
  const getSentimentInfo = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return { 
          icon: <ThumbsUp className="h-4 w-4" />, 
          color: "text-green-600 bg-green-100" 
        };
      case "negative":
        return { 
          icon: <ThumbsDown className="h-4 w-4" />, 
          color: "text-red-600 bg-red-100" 
        };
      default:
        return { 
          icon: <User className="h-4 w-4" />, 
          color: "text-gray-600 bg-gray-100" 
        };
    }
  };

  // Helper function to get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "sent":
        return { 
          icon: <CheckCircle className="h-4 w-4" />, 
          color: "text-green-600" 
        };
      case "failed":
        return { 
          icon: <XCircle className="h-4 w-4" />, 
          color: "text-red-600" 
        };
      case "pending":
        return { 
          icon: <Clock className="h-4 w-4" />, 
          color: "text-amber-600" 
        };
      default:
        return { 
          icon: <Clock className="h-4 w-4" />, 
          color: "text-gray-600" 
        };
    }
  };

  // Helper function to generate relative time
  const getRelativeTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const filteredResponses = getFilteredResponses();

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI Responses</h1>
            <p className="mt-1 text-sm text-gray-600">
              View and manage all AI-generated responses to customer inquiries.
            </p>
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
                  placeholder="Search AI responses..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
            
            <div className="flex items-center space-x-2">
              <Select defaultValue={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                <Bot className="h-4 w-4 mr-2" />
                All Responses
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
              {renderResponsesList(filteredResponses)}
            </TabsContent>
            <TabsContent value="facebook" className="mt-6">
              {renderResponsesList(filteredResponses)}
            </TabsContent>
            <TabsContent value="instagram" className="mt-6">
              {renderResponsesList(filteredResponses)}
            </TabsContent>
            <TabsContent value="whatsapp" className="mt-6">
              {renderResponsesList(filteredResponses)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Response Performance</CardTitle>
            <CardDescription>Effectiveness of AI-generated responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Accuracy</span>
                <span className="text-sm font-medium">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: "92%" }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Customer Satisfaction</span>
                <span className="text-sm font-medium">89%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: "89%" }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Response Time</span>
                <span className="text-sm font-medium">24 seconds</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: "95%" }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>AI Model Performance</CardTitle>
            <CardDescription>Configuration and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="h-5 w-5 text-amber-500 mr-2" />
                  <span className="text-sm font-medium">Current Model</span>
                </div>
                <span className="text-sm font-medium">OpenAI GPT-4o</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium">Total AI Responses</span>
                </div>
                <span className="text-sm font-medium">142</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium">Escalated to Human</span>
                </div>
                <span className="text-sm font-medium">22%</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button variant="outline" className="w-full">
                <Bot className="mr-2 h-4 w-4" />
                Configure AI Settings
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Response Categories</CardTitle>
            <CardDescription>Types of customer inquiries handled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Product Information</span>
                    <span className="text-sm font-medium">35%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "35%" }}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Order Status</span>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "25%" }}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Shipping & Delivery</span>
                    <span className="text-sm font-medium">20%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: "20%" }}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Returns & Refunds</span>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: "15%" }}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Others</span>
                    <span className="text-sm font-medium">5%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-500 h-2 rounded-full" style={{ width: "5%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Automation Concept Image - Business Communication */}
      <Card className="mt-6 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          <div className="p-6 flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4">AI-Powered Communication</h2>
            <p className="text-gray-600 mb-6">
              Our advanced AI model leverages your knowledge base to deliver accurate, 
              personalized responses to customer inquiries across all social media platforms.
              This allows your team to focus on complex issues while the AI handles routine questions.
            </p>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Consistent brand voice across all platforms</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>24/7 availability for customer inquiries</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Automatic escalation for complex issues</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-200">
            <img 
              src="https://images.unsplash.com/photo-1535378620166-273708d44e4c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
              alt="AI automation concept with digital interface" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </Card>
    </>
  );

  function renderResponsesList(responses: AiResponseMessage[]) {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
        </div>
      );
    }

    if (!responses.length) {
      return (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No AI responses found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery 
              ? `No results found for "${searchQuery}"`
              : "AI responses will appear here once generated."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {responses.map((response) => {
          const sentimentInfo = getSentimentInfo(response.sentiment);
          const statusInfo = getStatusInfo(response.status);
          
          return (
            <div key={response.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {getPlatformIcon(response.platformId)}
                    <span className="ml-2 font-medium text-gray-900">{response.customerName}</span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-2">
                    {response.platform}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className={`inline-flex items-center ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <span className="ml-1">{response.status}</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{getRelativeTime(response.createdAt)}</span>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md mb-3">
                <p className="text-gray-700 whitespace-pre-wrap">{response.content}</p>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sentimentInfo.color}`}>
                    {sentimentInfo.icon}
                    <span className="ml-1 capitalize">{response.sentiment}</span>
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Bot className="h-3 w-3 mr-1" />
                    AI Generated
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button size="sm">View Conversation</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
