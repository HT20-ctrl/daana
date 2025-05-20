import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Download, MessageSquare, Bot, User2, Heart, FileDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { exportAnalyticsToPdf } from "@/lib/pdfExport";
import ConnectPlatformDialog from "@/components/shared/ConnectPlatformDialog";
import StatCard from "@/components/dashboard/StatCard";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

// Lazy load heavy components
const PlatformPerformance = lazy(() => import("@/components/dashboard/PlatformPerformance"));
const RecentConversations = lazy(() => import("@/components/dashboard/RecentConversations"));
const AiEfficiency = lazy(() => import("@/components/dashboard/AiEfficiency"));
const KnowledgeBase = lazy(() => import("@/components/dashboard/KnowledgeBase"));
const TeamActivity = lazy(() => import("@/components/dashboard/TeamActivity"));

import { 
  Analytics, 
  Conversation, 
  KnowledgeBase as KnowledgeBaseType,
  Platform 
} from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7days");
  
  // Fetch data with stale time and cache configurations to improve performance
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: conversations, isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: platforms, isLoading: isLoadingPlatforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
    staleTime: 5 * 60 * 1000, // 5 minutes 
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
  
  const { data: knowledgeBase, isLoading: isLoadingKnowledgeBase } = useQuery<KnowledgeBaseType[]>({
    queryKey: ["/api/knowledge-base"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
  
  const { toast } = useToast();
  
  // Determine if all data is still loading
  const isLoading = isLoadingAnalytics || isLoadingConversations || isLoadingPlatforms || isLoadingKnowledgeBase;
  
  // Generate sample platform performance data
  const [performanceData, setPerformanceData] = useState([
    { day: "Mon", value: 65 },
    { day: "Tue", value: 80 },
    { day: "Wed", value: 75 },
    { day: "Thu", value: 85 },
    { day: "Fri", value: 90 },
    { day: "Sat", value: 70 },
    { day: "Sun", value: 60 }
  ]);
  
  // Sample team activity data
  const teamActivities = [
    {
      id: 1,
      actor: {
        id: "1",
        name: "Rachel Kim",
        avatar: "https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256"
      },
      action: "responded to a Facebook message from John Davis",
      timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    },
    {
      id: 2,
      actor: {
        id: "2",
        name: "David Wilson",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256"
      },
      action: "uploaded a new knowledge base document",
      target: "Return_Policy.pdf",
      timestamp: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    },
    {
      id: 3,
      actor: {
        id: "3",
        name: "Tom Jackson",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256"
      },
      action: "connected a new Instagram business account",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    }
  ];
  
  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    
    // Update performance data based on range
    // This would normally fetch from API
    if (range === "30days") {
      setPerformanceData([
        { day: "Week 1", value: 72 },
        { day: "Week 2", value: 85 },
        { day: "Week 3", value: 92 },
        { day: "Week 4", value: 78 }
      ]);
    } else if (range === "90days") {
      setPerformanceData([
        { day: "Jan", value: 65 },
        { day: "Feb", value: 75 },
        { day: "Mar", value: 85 }
      ]);
    } else {
      // 7days (default)
      setPerformanceData([
        { day: "Mon", value: 65 },
        { day: "Tue", value: 80 },
        { day: "Wed", value: 75 },
        { day: "Thu", value: 85 },
        { day: "Fri", value: 90 },
        { day: "Sat", value: 70 },
        { day: "Sun", value: 60 }
      ]);
    }
  };
  
  // Format user name for welcome message
  const getUserFirstName = () => {
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split('@')[0];
    return "there";
  };
  
  // Handle exporting analytics data to PDF
  const handleExportAnalytics = () => {
    if (!analytics || !platforms || !conversations) {
      toast({
        title: "Export failed",
        description: "Some data is still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Generate PDF with analytics data
      exportAnalyticsToPdf(
        analytics, 
        conversations, 
        platforms,
        {
          title: "Dana AI Analytics Report",
          subtitle: `Dashboard Overview - ${timeRange === "7days" ? "Last 7 Days" : timeRange === "30days" ? "Last 30 Days" : "Last 90 Days"}`,
          fileName: `dana-ai-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`
        }
      );
      
      toast({
        title: "Export successful",
        description: "Your analytics report has been downloaded.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error exporting analytics to PDF:", error);
      toast({
        title: "Export failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // For now, let's remove the skeleton loading to fix the white screen issue
  // We'll use the individual component loading states instead

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Welcome back, {getUserFirstName()}!</h1>
            <p className="mt-1 text-sm text-gray-600">Here's what's happening with your social media accounts today.</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <ConnectPlatformDialog />
            <Button 
              variant="outline" 
              onClick={handleExportAnalytics}
              disabled={isLoading}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isLoading ? "Loading..." : "Export Report"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Messages"
          value={analytics?.totalMessages || 0}
          icon={<MessageSquare className="h-5 w-5 text-indigo-600" />}
          iconBackground="bg-indigo-100"
          change={{ value: "12% from yesterday", isPositive: true }}
          delay={100}
        />
        
        <StatCard
          title="AI Responses"
          value={analytics?.aiResponses || 0}
          icon={<Bot className="h-5 w-5 text-green-600" />}
          iconBackground="bg-green-100"
          change={{ value: "18% from yesterday", isPositive: true }}
          delay={200}
        />
        
        <StatCard
          title="Manual Responses"
          value={analytics?.manualResponses || 0}
          icon={<User2 className="h-5 w-5 text-red-600" />}
          iconBackground="bg-red-100"
          change={{ value: "8% from yesterday", isPositive: false }}
          delay={300}
        />
        
        <StatCard
          title="Sentiment Score"
          value={`${analytics?.sentimentScore || 0}%`}
          icon={<Heart className="h-5 w-5 text-blue-600" />}
          iconBackground="bg-blue-100"
          change={{ value: "3% from yesterday", isPositive: true }}
          delay={400}
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Performance Chart */}
          <Suspense fallback={<div className="h-72 rounded-lg bg-gray-100 animate-pulse"></div>}>
            <PlatformPerformance 
              data={performanceData}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </Suspense>
          
          {/* Recent Conversations */}
          <Suspense fallback={<div className="h-96 rounded-lg bg-gray-100 animate-pulse"></div>}>
            <RecentConversations 
              conversations={conversations} 
              isLoading={isLoadingConversations}
            />
          </Suspense>
          
          {/* Social Media Dashboard Banner */}
          <Card className="overflow-hidden shadow-lg">
            <div className="w-full h-[200px] bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Unified Social Platform</h3>
                <p className="text-sm text-white/80">Manage all your social accounts in one powerful dashboard with AI assistance.</p>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Connect your accounts and start managing conversations across all channels in one place.</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* AI Efficiency */}
          <Suspense fallback={<div className="h-64 rounded-lg bg-gray-100 animate-pulse"></div>}>
            <AiEfficiency
              percentage={analytics?.aiResponses && analytics.totalMessages > 0 
                ? Math.round((analytics.aiResponses / analytics.totalMessages) * 100) 
                : 0}
              aiMessages={analytics?.aiResponses || 0}
              totalMessages={analytics?.totalMessages || 0}
              responseTime="24 seconds"
              satisfaction="92%"
              escalationRate="22%"
              model="OpenAI GPT-4o"
            />
          </Suspense>
          
          {/* Knowledge Base */}
          <Suspense fallback={<div className="h-64 rounded-lg bg-gray-100 animate-pulse"></div>}>
            <KnowledgeBase 
              knowledgeBase={knowledgeBase || []} 
              isLoading={isLoadingKnowledgeBase}
            />
          </Suspense>
          
          {/* Team Activity */}
          <Suspense fallback={<div className="h-72 rounded-lg bg-gray-100 animate-pulse"></div>}>
            <TeamActivity 
              activities={teamActivities}
              isLoading={false}
            />
          </Suspense>
          
          {/* Team Collaboration Banner */}
          <Card className="overflow-hidden shadow-lg">
            <div className="w-full h-[160px] bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white p-6">
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2">Team Collaboration</h3>
                <p className="text-sm text-white/80">Work together seamlessly to manage customer communications.</p>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Collaborate with your team members in real-time across all social platforms.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
