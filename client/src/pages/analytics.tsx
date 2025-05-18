import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, BarChart2, CalendarRange, ArrowUpRight, Bot, MessageSquare, Users, Activity, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportAnalyticsToPdf } from "@/lib/pdfExport";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7days");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  
  // Fetch data with query client
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/analytics"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["/api/conversations"],
    staleTime: 30 * 1000, // 30 seconds
  });
  
  const { data: platforms, isLoading: isLoadingPlatforms } = useQuery({
    queryKey: ["/api/platforms"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Mock data for charts
  const messageVolumeData = [
    { name: "Mon", facebook: 32, instagram: 24, whatsapp: 18, total: 74 },
    { name: "Tue", facebook: 40, instagram: 28, whatsapp: 29, total: 97 },
    { name: "Wed", facebook: 34, instagram: 30, whatsapp: 26, total: 90 },
    { name: "Thu", facebook: 44, instagram: 32, whatsapp: 24, total: 100 },
    { name: "Fri", facebook: 48, instagram: 36, whatsapp: 28, total: 112 },
    { name: "Sat", facebook: 38, instagram: 30, whatsapp: 22, total: 90 },
    { name: "Sun", facebook: 28, instagram: 24, whatsapp: 16, total: 68 }
  ];
  
  const responseTypeData = [
    { name: "AI", value: 142 },
    { name: "Manual", value: 42 },
  ];
  
  const sentimentData = [
    { name: "Positive", value: 65 },
    { name: "Neutral", value: 27 },
    { name: "Negative", value: 8 },
  ];
  
  const responseTimeData = [
    { name: "Mon", ai: 24, manual: 320 },
    { name: "Tue", ai: 26, manual: 298 },
    { name: "Wed", ai: 23, manual: 284 },
    { name: "Thu", ai: 29, manual: 305 },
    { name: "Fri", ai: 25, manual: 310 },
    { name: "Sat", ai: 27, manual: 350 },
    { name: "Sun", ai: 22, manual: 390 }
  ];

  const platformDistributionData = [
    { name: "Facebook", value: 45 },
    { name: "Instagram", value: 35 },
    { name: "WhatsApp", value: 20 },
  ];
  
  const topQueriesData = [
    { name: "Product Information", value: 35 },
    { name: "Order Status", value: 25 },
    { name: "Shipping & Delivery", value: 20 },
    { name: "Returns & Refunds", value: 15 },
    { name: "Others", value: 5 },
  ];
  
  // Colors for charts
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const PLATFORM_COLORS = {
    facebook: '#1877f2',
    instagram: '#e1306c',
    whatsapp: '#25d366',
    total: '#6b7280'
  };
  
  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    // Would typically fetch new data based on the range
  };
  
  // Determine if all data is still loading
  const isLoading = isLoadingAnalytics || isLoadingConversations || isLoadingPlatforms;
  
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
          subtitle: `Detailed Analytics - ${timeRange === "7days" ? "Last 7 Days" : 
                                           timeRange === "30days" ? "Last 30 Days" : 
                                           timeRange === "90days" ? "Last 90 Days" : "Last Year"}`,
          fileName: `dana-ai-detailed-analytics-${new Date().toISOString().split('T')[0]}.pdf`
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
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track performance metrics and generate insights across your social platforms.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Select defaultValue={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Key metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-white overflow-hidden shadow rounded-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <MessageSquare className="text-indigo-600 h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Messages</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">631</div>
                    <div className="text-xs text-green-500 flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      <span>12% from last period</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white overflow-hidden shadow rounded-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <Bot className="text-green-600 h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">AI Response Rate</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">77%</div>
                    <div className="text-xs text-green-500 flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      <span>5% from last period</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white overflow-hidden shadow rounded-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <Users className="text-blue-600 h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Unique Customers</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">248</div>
                    <div className="text-xs text-green-500 flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      <span>8% from last period</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white overflow-hidden shadow rounded-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "400ms" }}>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                <Activity className="text-amber-600 h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Response Time</dt>
                  <dd>
                    <div className="text-lg font-semibold text-gray-900">24s</div>
                    <div className="text-xs text-green-500 flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      <span>15% from last period</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="ai">AI Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Message Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Message Volume</CardTitle>
              <CardDescription>Total messages across all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={messageVolumeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="facebook" name="Facebook" fill={PLATFORM_COLORS.facebook} />
                    <Bar dataKey="instagram" name="Instagram" fill={PLATFORM_COLORS.instagram} />
                    <Bar dataKey="whatsapp" name="WhatsApp" fill={PLATFORM_COLORS.whatsapp} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Response Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Response Type</CardTitle>
                <CardDescription>AI vs. Manual responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={responseTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {responseTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#ef4444'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Customer Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Sentiment</CardTitle>
                <CardDescription>Based on message content analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            index === 0 ? '#10b981' : // Positive - green
                            index === 1 ? '#6b7280' : // Neutral - gray
                            '#ef4444'                 // Negative - red
                          } />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Response Time Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Comparison</CardTitle>
              <CardDescription>AI vs Manual response time in seconds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={responseTimeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="ai" 
                      name="AI Response (seconds)" 
                      stroke="#2563eb" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="manual" 
                      name="Manual Response (seconds)" 
                      stroke="#ef4444" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Platforms Tab */}
        <TabsContent value="platforms" className="space-y-6">
          {/* Platform Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
              <CardDescription>Message volume by platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-center md:col-span-1">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill={PLATFORM_COLORS.facebook} />
                          <Cell fill={PLATFORM_COLORS.instagram} />
                          <Cell fill={PLATFORM_COLORS.whatsapp} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center mb-2">
                        <SiFacebook className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-medium">Facebook</h3>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">45%</p>
                      <p className="text-sm text-gray-600 mt-2">264 messages</p>
                      <div className="text-xs text-green-500 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        <span>7% from last period</span>
                      </div>
                    </div>
                    
                    <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                      <div className="flex items-center mb-2">
                        <SiInstagram className="h-5 w-5 text-pink-600 mr-2" />
                        <h3 className="font-medium">Instagram</h3>
                      </div>
                      <p className="text-2xl font-bold text-pink-600">35%</p>
                      <p className="text-sm text-gray-600 mt-2">204 messages</p>
                      <div className="text-xs text-green-500 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        <span>12% from last period</span>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <div className="flex items-center mb-2">
                        <SiWhatsapp className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="font-medium">WhatsApp</h3>
                      </div>
                      <p className="text-2xl font-bold text-green-600">20%</p>
                      <p className="text-sm text-gray-600 mt-2">163 messages</p>
                      <div className="text-xs text-amber-500 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        <span>2% from last period</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Platform Insights</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 mr-2">
                          <SiFacebook className="h-3 w-3" />
                        </span>
                        <span className="text-sm">Facebook engagement is highest on weekdays between 3-6pm</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink-100 text-pink-600 mr-2">
                          <SiInstagram className="h-3 w-3" />
                        </span>
                        <span className="text-sm">Instagram shows 12% growth in customer inquiries</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-600 mr-2">
                          <SiWhatsapp className="h-3 w-3" />
                        </span>
                        <span className="text-sm">WhatsApp customers have the highest satisfaction scores</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Platform Performance Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Performance Over Time</CardTitle>
              <CardDescription>Message volume trends by platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={messageVolumeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="facebook" 
                      name="Facebook" 
                      stackId="1"
                      stroke={PLATFORM_COLORS.facebook} 
                      fill={PLATFORM_COLORS.facebook} 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="instagram" 
                      name="Instagram" 
                      stackId="1"
                      stroke={PLATFORM_COLORS.instagram} 
                      fill={PLATFORM_COLORS.instagram} 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="whatsapp" 
                      name="WhatsApp" 
                      stackId="1"
                      stroke={PLATFORM_COLORS.whatsapp} 
                      fill={PLATFORM_COLORS.whatsapp} 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Performance Tab */}
        <TabsContent value="ai" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Response Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Query Categories</CardTitle>
                <CardDescription>Topics AI is handling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topQueriesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {topQueriesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* AI Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle>AI Effectiveness</CardTitle>
                <CardDescription>AI performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Accuracy</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Human Escalation Rate</span>
                      <span className="text-sm font-medium">22%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: "22%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Customer Satisfaction</span>
                      <span className="text-sm font-medium">89%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: "89%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Knowledge Base Utilization</span>
                      <span className="text-sm font-medium">76%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: "76%" }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">AI Model: OpenAI GPT-4o</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Average Response Time</p>
                      <p className="font-medium">24 seconds</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Knowledge Base</p>
                      <p className="font-medium">3 documents</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Response Length</p>
                      <p className="font-medium">218 characters</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium">Today</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* AI Response Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>AI Response Volume</CardTitle>
              <CardDescription>Number of AI responses over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={messageVolumeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="Total Messages" 
                      stroke="#6b7280" 
                      strokeDasharray="3 3"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="facebook" 
                      name="Facebook AI Responses" 
                      stroke={PLATFORM_COLORS.facebook} 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="instagram" 
                      name="Instagram AI Responses" 
                      stroke={PLATFORM_COLORS.instagram} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="whatsapp" 
                      name="WhatsApp AI Responses" 
                      stroke={PLATFORM_COLORS.whatsapp} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {/* Customer Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Rate</CardTitle>
                <CardDescription>How quickly you respond</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="relative h-32 w-32">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#2563eb" strokeWidth="10" strokeDasharray="283" strokeDashoffset="28" />
                      <text x="50" y="50" fontSize="20" textAnchor="middle" alignmentBaseline="middle" fill="#2563eb" fontWeight="bold">90%</text>
                    </svg>
                  </div>
                  <p className="mt-4 text-sm text-gray-600 text-center">
                    90% of messages are responded to within 30 minutes
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
                <CardDescription>Based on sentiment analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="relative h-32 w-32">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="283" strokeDashoffset="56" />
                      <text x="50" y="50" fontSize="20" textAnchor="middle" alignmentBaseline="middle" fill="#10b981" fontWeight="bold">80%</text>
                    </svg>
                  </div>
                  <p className="mt-4 text-sm text-gray-600 text-center">
                    80% of customer interactions are positive
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Resolution Rate</CardTitle>
                <CardDescription>Issues resolved without escalation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="relative h-32 w-32">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#8b5cf6" strokeWidth="10" strokeDasharray="283" strokeDashoffset="85" />
                      <text x="50" y="50" fontSize="20" textAnchor="middle" alignmentBaseline="middle" fill="#8b5cf6" fontWeight="bold">70%</text>
                    </svg>
                  </div>
                  <p className="mt-4 text-sm text-gray-600 text-center">
                    70% of inquiries resolved without human intervention
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Peak Activity Times */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Activity Times</CardTitle>
              <CardDescription>When your customers are most active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { hour: "12am", value: 12 },
                      { hour: "3am", value: 5 },
                      { hour: "6am", value: 8 },
                      { hour: "9am", value: 32 },
                      { hour: "12pm", value: 45 },
                      { hour: "3pm", value: 60 },
                      { hour: "6pm", value: 75 },
                      { hour: "9pm", value: 30 }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Message Volume" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Peak Activity Insights</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 mr-2 text-xs">1</span>
                    <span>Highest activity occurs between 6-8pm on weekdays</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 mr-2 text-xs">2</span>
                    <span>Weekend activity peaks earlier, around 12-3pm</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 mr-2 text-xs">3</span>
                    <span>Consider increasing AI capacity during peak hours</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Business Communication Banner */}
      <Card className="mt-6 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          <div className="bg-gray-900 text-white p-6 flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4">Data-Driven Communication Strategy</h2>
            <p className="text-gray-300 mb-6">
              Use these insights to optimize your social media strategy and improve 
              customer engagement across all platforms. Dana AI helps you understand 
              your audience and deliver timely, relevant responses.
            </p>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <BarChart2 className="h-5 w-5 text-blue-400 mr-2" />
                <span>Identify peak engagement times for better staffing</span>
              </div>
              <div className="flex items-center">
                <CalendarRange className="h-5 w-5 text-blue-400 mr-2" />
                <span>Schedule content based on platform-specific trends</span>
              </div>
              <div className="flex items-center">
                <Bot className="h-5 w-5 text-blue-400 mr-2" />
                <span>Optimize AI training based on common queries</span>
              </div>
            </div>
          </div>
          <div>
            <img 
              src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
              alt="Business team analyzing communication data" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </Card>
    </>
  );
}
