import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SiFacebook, SiInstagram, SiWhatsapp, SiSlack, SiZendesk, SiHubspot, SiSalesforce } from "react-icons/si";
import { Platform, User } from "@shared/schema";
import ConnectPlatformDialog from "@/components/shared/ConnectPlatformDialog";
import FacebookConnectButton from "@/components/shared/platforms/FacebookConnectButton";
import InstagramConnectButton from "@/components/shared/platforms/InstagramConnectButton";
import WhatsAppConnectButton from "@/components/shared/platforms/WhatsAppConnectButton";
import SlackConnectButton from "@/components/shared/platforms/SlackConnectButton";
import EmailConnectButton from "@/components/shared/platforms/EmailConnectButton";
import HubSpotConnectButton from "@/components/shared/platforms/HubSpotConnectButton";
import SalesforceConnectButton from "@/components/shared/platforms/SalesforceConnectButton";
import { 
  UserCircle, 
  Bell, 
  Shield, 
  Key, 
  Bot, 
  Zap, 
  CreditCard, 
  Package, 
  Trash2, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Mail
} from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const { setTheme, theme } = useTheme();
  
  // Platform connect triggers
  const [showPlatformConnect, setShowPlatformConnect] = useState<string | null>(null);
  
  // Get connected platforms
  const { data: platforms, isLoading: isLoadingPlatforms, refetch: refetchPlatforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });
  
  // Check URL for platform connection requests
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectPlatform = params.get('connect');
    const tabParam = params.get('tab');
    
    if (tabParam) {
      // Set the active tab based on URL parameter
      setActiveTab(tabParam);
    }
    
    if (connectPlatform) {
      // Set the active tab to platforms
      setActiveTab("platforms");
      
      // Set the platform to connect
      setShowPlatformConnect(connectPlatform);
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  // Define default values for user data
  const defaultUser = {
    firstName: "",
    lastName: "",
    email: "",
    role: "User"
  };

  // Form state - ensure we properly handle undefined user
  const [profileForm, setProfileForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>({
    firstName: user?.firstName ?? defaultUser.firstName,
    lastName: user?.lastName ?? defaultUser.lastName,
    email: user?.email ?? defaultUser.email,
    role: user?.role ?? defaultUser.role
  });
  
  // AI Settings state
  const [aiSettings, setAiSettings] = useState({
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 500,
    responseTimeout: 30,
    enableKnowledgeBase: true,
    fallbackToHuman: true
  });
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    desktopNotifications: true,
    newMessageAlerts: true,
    assignmentNotifications: true,
    summaryReports: true,
  });
  
  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Show a loading toast
      toast({
        title: "Saving profile changes...",
        description: "Please wait while we update your information"
      });
      
      // Simulate API call with a short delay
      setTimeout(() => {
        // In a production environment, this would call an API endpoint
        console.log("Profile update being saved:", profileForm);
        
        // Update the stored user information with the new profile data
        if (user) {
          // In a production environment, this would be done automatically by the API
          console.log("Updated user profile: ", {...user, ...profileForm});
        }
        
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully."
        });
      }, 800);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle AI settings update
  const handleAiSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Show a loading toast
      toast({
        title: "Saving AI settings...",
        description: "Updating your AI configuration"
      });
      
      // Simulate API call with a short delay
      setTimeout(() => {
        // In a production environment, this would call an API endpoint
        console.log("AI settings being saved:", aiSettings);
        
        toast({
          title: "AI settings updated",
          description: `Your AI configuration has been updated successfully. Using ${aiSettings.model} with temperature ${aiSettings.temperature}.`
        });
      }, 800);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update AI settings. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle disconnect platform
  const handleDisconnectPlatform = async (platformId: number) => {
    try {
      // Get platform details before disconnecting
      const platform = platforms?.find(p => p.id === platformId);
      
      if (!platform) {
        throw new Error("Platform not found");
      }
      
      const platformName = platform.displayName || "Platform";
      const platformType = platform.name; // Store platform type (facebook, etc.)
      
      // Show immediate feedback to the user
      toast({
        title: `Disconnecting ${platformName}...`,
        description: 'Please wait a moment',
      });
      
      // Use platform-specific disconnect endpoints when available
      if (platformType === "facebook") {
        console.log("Using Facebook-specific disconnect endpoint");
        await apiRequest("POST", `/api/platforms/facebook/disconnect`);
      } else if (platformType === "instagram") {
        console.log("Using Instagram-specific disconnect endpoint");
        await apiRequest("POST", `/api/platforms/instagram/disconnect`);
      } else {
        // Fall back to generic endpoint for other platforms
        console.log(`Using generic disconnect for platform ${platformType}`);
        await apiRequest("POST", `/api/platforms/${platformId}/disconnect`);
      }
      
      // Force immediate refetch to update UI
      await refetchPlatforms();
      
      // Force platform status refresh for this specific platform type
      await queryClient.invalidateQueries({ queryKey: [`/api/platforms/${platformType}/status`] });
      
      // Also invalidate all platforms
      await queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      
      // Clear any old URL parameters to avoid confusion
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Force update platform statuses
      await apiRequest("GET", `/api/platforms/${platformType}/status`);
      await apiRequest("GET", "/api/platforms");
      
      // Show success message
      toast({
        title: `${platformName} disconnected`,
        description: `${platformName} has been successfully disconnected from your account.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error disconnecting platform:", error);
      toast({
        title: "Disconnect failed",
        description: "Failed to disconnect platform. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Get platform icon by platform name
  const getPlatformIcon = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case "facebook":
        return <SiFacebook className="h-5 w-5 text-blue-600" />;
      case "instagram":
        return <SiInstagram className="h-5 w-5 text-pink-600" />;
      case "whatsapp":
        return <SiWhatsapp className="h-5 w-5 text-green-500" />;
      case "slack":
        return <SiSlack className="h-5 w-5 text-purple-500" />;
      case "hubspot":
        return <SiHubspot className="h-5 w-5 text-orange-500" />;
      case "zendesk":
        return <SiZendesk className="h-5 w-5 text-gray-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Trigger platform connection when coming from sidebar
  useEffect(() => {
    if (showPlatformConnect) {
      // If there's a platform to connect, trigger clicking the appropriate button
      const buttonId = `connect-${showPlatformConnect}-button`;
      setTimeout(() => {
        const button = document.getElementById(buttonId);
        if (button) {
          button.click();
          setShowPlatformConnect(null);
        }
      }, 300); // Small delay to ensure the UI is fully rendered
    }
  }, [showPlatformConnect, activeTab]);

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span className="ml-1">Back to Dashboard</span>
              </a>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your account settings and configure platform preferences.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="profile">
            <UserCircle className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="platforms">
            <MessageSquare className="h-4 w-4 mr-2" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Bot className="h-4 w-4 mr-2" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account profile information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profileForm.role}
                      disabled
                    />
                    <p className="text-xs text-gray-500">
                      Your role determines your permissions in the system. Contact an administrator to change.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Theme Preference</Label>
                    <div className="flex items-center space-x-2">
                      <Select
                        defaultValue={theme}
                        onValueChange={(value) => setTheme(value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button type="submit">Save Changes</Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Account</CardTitle>
                  <CardDescription>
                    Manage your account settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Account Security</p>
                        <p className="text-xs text-gray-500">Password and authentication</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Security settings",
                          description: "Account security settings will be available in a future update.",
                        });
                      }}
                    >
                      Manage
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Key className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium">API Access</p>
                        <p className="text-xs text-gray-500">Generate API keys</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "API Access",
                          description: "API configuration will be available in a future update.",
                        });
                      }}
                    >
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible account actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Platforms Tab */}
        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Connected Platforms</CardTitle>
                  <CardDescription>
                    Manage your connected social media platforms and business tools.
                  </CardDescription>
                </div>
                <ConnectPlatformDialog />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPlatforms ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
                </div>
              ) : !platforms || platforms.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No platforms connected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Connect your social media platforms to start managing conversations.
                  </p>
                  <ConnectPlatformDialog trigger={
                    <Button className="mt-4">
                      Connect Platform
                    </Button>
                  } />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Social Media Platforms */}
                    <div className="col-span-full">
                      <h3 className="text-lg font-medium mb-4">Social Media</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Show existing platforms */}
                        {Array.isArray(platforms) && platforms
                         .filter(p => p && p.name && ["facebook", "instagram", "whatsapp"].includes(p.name.toLowerCase()))
                         .filter(p => p.isConnected === true) // Only show connected platforms
                         // Special handling for Facebook - only show one card per platform type
                         .filter((platform, index, self) => 
                            platform.name.toLowerCase() !== "facebook" || 
                            index === self.findIndex(p => p.name.toLowerCase() === "facebook")
                         )
                         .map((platform) => (
                          <Card key={platform.id} className="bg-gray-50 border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {getPlatformIcon(platform.name)}
                                  <div className="ml-3">
                                    <p className="text-sm font-medium">{platform.displayName}</p>
                                    <div className="flex items-center mt-1">
                                      {platform.isConnected ? (
                                        <span className="flex items-center text-xs text-green-600">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Connected
                                        </span>
                                      ) : (
                                        <span className="flex items-center text-xs text-red-600">
                                          <XCircle className="h-3 w-3 mr-1" />
                                          Disconnected
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">Disconnect</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Disconnect {platform.displayName}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will disconnect your {platform.displayName} account. You will need to reconnect to continue managing conversations from this platform.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDisconnectPlatform(platform.id)}
                                      >
                                        Disconnect
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {/* Facebook - show either connect button or disconnect option */}
                        <Card className="bg-gray-50 border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <SiFacebook className="h-5 w-5 text-blue-600" />
                                <div className="ml-3">
                                  <p className="text-sm font-medium">Facebook</p>
                                  <p className="text-xs text-gray-500">Connect your business pages</p>
                                </div>
                              </div>
                              {Array.isArray(platforms) && platforms.some(p => p?.name?.toLowerCase() === "facebook") ? (
                                <FacebookConnectButton 
                                  platform={platforms.find(p => p?.name?.toLowerCase() === "facebook")}
                                  showDisconnect={true}
                                />
                              ) : (
                                <FacebookConnectButton />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Instagram - show either connect button or disconnect option */}
                        <Card className="bg-gray-50 border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <SiInstagram className="h-5 w-5 text-pink-600" />
                                <div className="ml-3">
                                  <p className="text-sm font-medium">Instagram</p>
                                  <p className="text-xs text-gray-500">Connect your business account</p>
                                </div>
                              </div>
                              {Array.isArray(platforms) && platforms.some(p => p?.name?.toLowerCase() === "instagram") ? (
                                <InstagramConnectButton 
                                  platform={platforms.find(p => p?.name?.toLowerCase() === "instagram")}
                                  showDisconnect={true}
                                />
                              ) : (
                                <InstagramConnectButton />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* WhatsApp - show either connect button or disconnect option */}
                        <Card className="bg-gray-50 border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <SiWhatsapp className="h-5 w-5 text-green-600" />
                                <div className="ml-3">
                                  <p className="text-sm font-medium">WhatsApp</p>
                                  <p className="text-xs text-gray-500">Connect your business account</p>
                                </div>
                              </div>
                              {Array.isArray(platforms) && platforms.some(p => p?.name?.toLowerCase() === "whatsapp") ? (
                                <WhatsAppConnectButton 
                                  platform={platforms.find(p => p?.name?.toLowerCase() === "whatsapp")}
                                  showDisconnect={true}
                                />
                              ) : (
                                <WhatsAppConnectButton />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Add more platforms option */}
                        <ConnectPlatformDialog trigger={
                          <Card className="bg-gray-50 border border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">+</span>
                              </div>
                              <p className="text-sm font-medium text-gray-500 mt-2">Add Platform</p>
                            </CardContent>
                          </Card>
                        } />
                        
                        {/* Add more platforms option */}
                        <ConnectPlatformDialog trigger={
                          <Card className="bg-gray-50 border border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">+</span>
                              </div>
                              <p className="text-sm font-medium text-gray-500 mt-2">Add Platform</p>
                            </CardContent>
                          </Card>
                        } />
                      </div>
                    </div>
                    
                    {/* Business Tools */}
                    <div className="col-span-full mt-6">
                      <h3 className="text-lg font-medium mb-4">Business Tools</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Show connected business tools platforms */}
                        {Array.isArray(platforms) && platforms
                         .filter(p => p && p.name && ["slack", "email", "hubspot", "salesforce"].includes(p.name.toLowerCase()))
                         .filter(p => p.isConnected === true) // Only show connected platforms
                         .map((platform) => (
                          <Card key={platform.id} className="bg-gray-50 border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {getPlatformIcon(platform.name)}
                                  <div className="ml-3">
                                    <p className="text-sm font-medium">{platform.displayName}</p>
                                    <div className="flex items-center mt-1">
                                      <span className="flex items-center text-xs text-green-600">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Connected
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">Disconnect</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Disconnect {platform.displayName}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will disconnect your {platform.displayName} account. You will need to reconnect to continue managing conversations from this platform.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDisconnectPlatform(platform.id)}
                                      >
                                        Disconnect
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                          
                        {/* Slack Connect Button - only show if Slack not already connected */}
                        {!(Array.isArray(platforms) && platforms.some(p => p?.name?.toLowerCase() === "slack" && p.isConnected)) && (
                          <Card className="bg-gray-50 border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <SiSlack className="h-5 w-5 text-purple-600" />
                                  <div className="ml-3">
                                    <p className="text-sm font-medium">Slack</p>
                                    <p className="text-xs text-gray-500">Connect your workspace</p>
                                  </div>
                                </div>
                                <SlackConnectButton />
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Email Connect Button - only show if Email not already connected */}
                        {!(Array.isArray(platforms) && platforms.some(p => p?.name?.toLowerCase() === "email" && p.isConnected)) && (
                          <Card className="bg-gray-50 border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Mail className="h-5 w-5 text-blue-600" />
                                  <div className="ml-3">
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-xs text-gray-500">Connect email integration</p>
                                  </div>
                                </div>
                                <EmailConnectButton />
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* HubSpot Connect Button - only show if HubSpot not already connected */}
                        {!(Array.isArray(platforms) && platforms.some(p => p?.name?.toLowerCase() === "hubspot" && p.isConnected)) && (
                          <Card className="bg-gray-50 border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <SiHubspot className="h-5 w-5 text-orange-600" />
                                  <div className="ml-3">
                                    <p className="text-sm font-medium">HubSpot</p>
                                    <p className="text-xs text-gray-500">Connect CRM integration</p>
                                  </div>
                                </div>
                                <HubSpotConnectButton />
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Salesforce Connect Button - only show if Salesforce not already connected */}
                        {!(Array.isArray(platforms) && platforms.some(p => p?.name?.toLowerCase() === "salesforce" && p.isConnected)) && (
                          <Card className="bg-gray-50 border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <SiSalesforce className="h-5 w-5 text-blue-700" />
                                  <div className="ml-3">
                                    <p className="text-sm font-medium">Salesforce</p>
                                    <p className="text-xs text-gray-500">Connect CRM integration</p>
                                  </div>
                                </div>
                                <SalesforceConnectButton />
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Add more platforms option */}
                        <ConnectPlatformDialog trigger={
                          <Card className="bg-gray-50 border border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">+</span>
                              </div>
                              <p className="text-sm font-medium text-gray-500 mt-2">Add Business Tool</p>
                            </CardContent>
                          </Card>
                        } />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mt-8">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Zap className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">Platform Integration Tips</h3>
                        <div className="mt-2 text-sm text-amber-700">
                          <ul className="list-disc pl-5 space-y-1">
                            <li>For best results, connect both your business page and personal account for each platform</li>
                            <li>Make sure you have admin permissions on any pages you connect</li>
                            <li>If you encounter connection issues, try disconnecting and reconnecting the platform</li>
                            <li>For business tools, you may need to generate API keys in their respective dashboards</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Settings Tab */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure AI behavior and response generation settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAiSettingsUpdate} className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="model" className="text-base">AI Model</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Select which AI model to use for generating responses.
                    </p>
                    <Select
                      defaultValue={aiSettings.model}
                      onValueChange={(value) => setAiSettings({ ...aiSettings, model: value })}
                    >
                      <SelectTrigger id="model" className="w-[300px]">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">OpenAI GPT-4o (Recommended)</SelectItem>
                        <SelectItem value="gpt-4">OpenAI GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Response Generation</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Temperature</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            id="temperature"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={aiSettings.temperature}
                            onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                          <span className="text-sm w-12 text-center">{aiSettings.temperature}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Higher values make output more random, lower values more deterministic.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="maxTokens">Max Response Length</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            id="maxTokens"
                            type="range"
                            min="100"
                            max="1000"
                            step="50"
                            value={aiSettings.maxTokens}
                            onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value) })}
                            className="w-full"
                          />
                          <span className="text-sm w-12 text-center">{aiSettings.maxTokens}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Maximum number of tokens in generated responses.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="responseTimeout">Response Timeout (seconds)</Label>
                        <Input
                          id="responseTimeout"
                          type="number"
                          min="5"
                          max="60"
                          value={aiSettings.responseTimeout}
                          onChange={(e) => setAiSettings({ ...aiSettings, responseTimeout: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-gray-500">
                          Maximum time to wait for AI response generation.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Behavior Settings</h3>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="enableKnowledgeBase">Enable Knowledge Base</Label>
                          <p className="text-sm text-gray-500">
                            Use uploaded documents to enhance AI responses.
                          </p>
                        </div>
                        <Switch
                          id="enableKnowledgeBase"
                          checked={aiSettings.enableKnowledgeBase}
                          onCheckedChange={(checked) => setAiSettings({ ...aiSettings, enableKnowledgeBase: checked })}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="fallbackToHuman">Auto-Escalate to Human</Label>
                          <p className="text-sm text-gray-500">
                            Automatically escalate complex queries to human agents.
                          </p>
                        </div>
                        <Switch
                          id="fallbackToHuman"
                          checked={aiSettings.fallbackToHuman}
                          onCheckedChange={(checked) => setAiSettings({ ...aiSettings, fallbackToHuman: checked })}
                        />
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md mt-6">
                        <h4 className="text-sm font-medium mb-2">AI Response Example</h4>
                        <div className="bg-white p-3 rounded border text-sm">
                          <p>Thank you for reaching out about our return policy. Based on our records, you can return any unopened item within 30 days of purchase for a full refund. Would you like me to initiate a return for your recent order?</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          This is a sample of how AI will respond with your current settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button type="submit">Save AI Settings</Button>
              </form>
            </CardContent>
          </Card>
          
          {/* AI Automation Concept Image */}
          <Card className="mt-6 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-6 flex flex-col justify-center">
                <h2 className="text-2xl font-bold mb-4">AI-Powered Communication</h2>
                <p className="text-gray-600 mb-6">
                  Our advanced AI engine analyzes customer messages and leverages your knowledge base
                  to generate relevant, accurate responses that match your brand voice.
                </p>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <Bot className="h-5 w-5 text-primary-600 mr-2" />
                    <span>Customize AI behavior to match your needs</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-primary-600 mr-2" />
                    <span>Leverage your knowledge base for accurate answers</span>
                  </div>
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-primary-600 mr-2" />
                    <span>Control when to escalate to human agents</span>
                  </div>
                </div>
              </div>
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1658204238967-9244ed056ebb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                  alt="AI automation concept with digital interface" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you want to be notified about platform activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive email notifications about important events.
                        </p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) => {
                          setNotificationSettings({ ...notificationSettings, emailNotifications: checked });
                          toast({
                            title: checked ? "Email notifications enabled" : "Email notifications disabled",
                            description: checked ? "You will now receive email notifications" : "You will no longer receive email notifications",
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="summaryReports">Daily Summary Reports</Label>
                        <p className="text-sm text-gray-500">
                          Receive daily email summaries of platform activity.
                        </p>
                      </div>
                      <Switch
                        id="summaryReports"
                        checked={notificationSettings.summaryReports}
                        onCheckedChange={(checked) => {
                          setNotificationSettings({ ...notificationSettings, summaryReports: checked });
                          toast({
                            title: checked ? "Daily summaries enabled" : "Daily summaries disabled",
                            description: checked ? "You will now receive daily activity reports" : "You will no longer receive daily activity reports",
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Platform Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="desktopNotifications">Desktop Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Show desktop notifications when you're using the platform.
                        </p>
                      </div>
                      <Switch
                        id="desktopNotifications"
                        checked={notificationSettings.desktopNotifications}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, desktopNotifications: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="newMessageAlerts">New Message Alerts</Label>
                        <p className="text-sm text-gray-500">
                          Get notified when new customer messages arrive.
                        </p>
                      </div>
                      <Switch
                        id="newMessageAlerts"
                        checked={notificationSettings.newMessageAlerts}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, newMessageAlerts: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="assignmentNotifications">Assignment Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Get notified when conversations are assigned to you.
                        </p>
                      </div>
                      <Switch
                        id="assignmentNotifications"
                        checked={notificationSettings.assignmentNotifications}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, assignmentNotifications: checked })}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      toast({
                        title: "Notification settings saved",
                        description: "Your notification preferences have been updated successfully",
                      });
                    }}
                  >
                    Save Notification Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-primary-700">Professional Plan</h3>
                    <p className="text-sm text-primary-600 mt-1">Your subscription renews on October 15, 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-700">$49<span className="text-base font-normal">/month</span></p>
                    <p className="text-sm text-primary-600">Billed Annually</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="text-sm">All social platforms</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="text-sm">AI-powered responses</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="text-sm">100 GB Knowledge Base</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="text-sm">Email + Chat Support</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Payment Method</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-white p-2 rounded-md shadow-sm border border-gray-200 mr-3">
                          <CreditCard className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Visa ending in 4242</p>
                          <p className="text-xs text-gray-500">Expires 10/2025</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Update</Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Billing Address</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm">123 Main Street</p>
                    <p className="text-sm">Suite 405</p>
                    <p className="text-sm">San Francisco, CA 94103</p>
                    <p className="text-sm">United States</p>
                    <Button variant="outline" size="sm" className="mt-3">Update</Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Billing History</h3>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Sep 15, 2023</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Annual Subscription - Professional Plan</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$588.00</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Paid
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm">Download</Button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Sep 15, 2022</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Annual Subscription - Professional Plan</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$588.00</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Paid
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm">Download</Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Subscription Management",
                    description: "Subscription management will be available in a future update.",
                  });
                }}
              >
                Cancel Subscription
              </Button>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Plan Management",
                      description: "Plan management will be available in a future update.",
                    });
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Change Plan
                </Button>
                <Button
                  onClick={() => {
                    toast({
                      title: "Billing Information",
                      description: "Billing management will be available in a future update.",
                    });
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Update Billing
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
