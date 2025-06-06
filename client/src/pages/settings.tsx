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
import { PlatformsSection } from "@/components/platforms/PlatformsSection";
import { PlatformConnectDialog } from "@/components/platforms/PlatformConnectDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define interfaces for user settings
interface AISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  responseTimeout: number;
  enableKnowledgeBase: boolean;
  fallbackToHuman: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  newMessageAlerts: boolean;
  assignmentNotifications: boolean;
  summaryReports: boolean;
}

interface ProfileSettings {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  company: string;
}

interface UserSettings {
  aiSettings: AISettings;
  notificationSettings: NotificationSettings;
  profileSettings: ProfileSettings;
}

import {
  CheckCircle,
  XCircle,
  UserCircle,
  MessageSquare,
  Bot,
  Bell,
  CreditCard,
  ArrowRight,
  Zap,
  Mail
} from "lucide-react";

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
import { Platform } from "@shared/schema";

export default function SettingsPage() {
  // State for active tab
  const [activeTab, setActiveTab] = useState("profile");
  const [isSettingsUpdating, setIsSettingsUpdating] = useState(false);
  const [showPlatformConnect, setShowPlatformConnect] = useState<string | null>(null);
  
  // Get query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const connect = params.get("connect");
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (connect) {
      setShowPlatformConnect(connect);
    }
  }, []);

  // Get user data
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get platforms
  const { data: platforms = [], isLoading: isLoadingPlatforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });

  // Default settings
  const defaultAISettings: AISettings = {
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 2048,
    responseTimeout: 120,
    enableKnowledgeBase: true,
    fallbackToHuman: true
  };

  const defaultNotificationSettings: NotificationSettings = {
    emailNotifications: true,
    desktopNotifications: true,
    newMessageAlerts: true,
    assignmentNotifications: true,
    summaryReports: false
  };

  const defaultProfileSettings: ProfileSettings = {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    role: "Customer Support Agent",
    company: "Your Company"
  };

  // Get user settings
  const { data: settings = {}, isLoading: isLoadingSettings } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    initialData: {
      aiSettings: defaultAISettings,
      notificationSettings: defaultNotificationSettings,
      profileSettings: defaultProfileSettings
    },
  });

  // Form state
  const [aiSettings, setAISettings] = useState<AISettings>(settings.aiSettings || defaultAISettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    settings.notificationSettings || defaultNotificationSettings
  );
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(
    settings.profileSettings || defaultProfileSettings
  );

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      if (settings.aiSettings) {
        setAISettings(settings.aiSettings);
      }
      if (settings.notificationSettings) {
        setNotificationSettings(settings.notificationSettings);
      }
      if (settings.profileSettings) {
        setProfileSettings({
          ...defaultProfileSettings,
          ...settings.profileSettings,
          // Always use authenticated user data for these fields if available
          firstName: user?.firstName || settings.profileSettings.firstName || "",
          lastName: user?.lastName || settings.profileSettings.lastName || "",
          email: user?.email || settings.profileSettings.email || ""
        });
      }
    }
  }, [settings, user]);

  // Handle AI settings change
  const handleAISettingChange = (setting: keyof AISettings, value: any) => {
    setAISettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Handle notification settings change
  const handleNotificationSettingChange = (setting: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Handle profile settings change
  const handleProfileSettingChange = (setting: keyof ProfileSettings, value: string) => {
    setProfileSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Save AI settings
  const saveAISettings = async () => {
    setIsSettingsUpdating(true);
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'ai',
          settings: aiSettings
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save AI settings');
      }
      
      // Update local data
      queryClient.setQueryData(['/api/user/settings'], (oldData: any) => ({
        ...oldData,
        aiSettings
      }));
      
      toast({
        title: 'Settings saved',
        description: 'Your AI settings have been updated successfully.'
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSettingsUpdating(false);
    }
  };

  // Save notification settings
  const saveNotificationSettings = async () => {
    setIsSettingsUpdating(true);
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'notifications',
          settings: notificationSettings
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }
      
      // Update local data
      queryClient.setQueryData(['/api/user/settings'], (oldData: any) => ({
        ...oldData,
        notificationSettings
      }));
      
      toast({
        title: 'Settings saved',
        description: 'Your notification settings have been updated successfully.'
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSettingsUpdating(false);
    }
  };

  // Save profile settings
  const saveProfileSettings = async () => {
    setIsSettingsUpdating(true);
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'profile',
          settings: profileSettings
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile settings');
      }
      
      // Update local data
      queryClient.setQueryData(['/api/user/settings'], (oldData: any) => ({
        ...oldData,
        profileSettings
      }));
      
      toast({
        title: 'Profile saved',
        description: 'Your profile settings have been updated successfully.'
      });
    } catch (error) {
      console.error('Error saving profile settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSettingsUpdating(false);
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
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account profile information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input 
                      id="firstName" 
                      value={profileSettings.firstName} 
                      onChange={(e) => handleProfileSettingChange('firstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input 
                      id="lastName" 
                      value={profileSettings.lastName} 
                      onChange={(e) => handleProfileSettingChange('lastName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileSettings.email}
                    onChange={(e) => handleProfileSettingChange('email', e.target.value)} 
                    disabled={!!user?.email} // Disable if user has authenticated email
                  />
                  {user?.email && (
                    <p className="text-xs text-gray-500 mt-1">
                      Your email is managed by your authentication provider and cannot be changed here.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={profileSettings.role} 
                      onValueChange={(value) => handleProfileSettingChange('role', value)}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer Support Agent">Customer Support Agent</SelectItem>
                        <SelectItem value="Social Media Manager">Social Media Manager</SelectItem>
                        <SelectItem value="Marketing Manager">Marketing Manager</SelectItem>
                        <SelectItem value="Sales Representative">Sales Representative</SelectItem>
                        <SelectItem value="Team Lead">Team Lead</SelectItem>
                        <SelectItem value="Administrator">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input 
                      id="company" 
                      value={profileSettings.company} 
                      onChange={(e) => handleProfileSettingChange('company', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileSettings({
                      ...defaultProfileSettings,
                      // Keep authenticated user data
                      firstName: user?.firstName || "",
                      lastName: user?.lastName || "",
                      email: user?.email || ""
                    });
                  }}
                >
                  Reset
                </Button>
                <Button 
                  onClick={saveProfileSettings}
                  disabled={isSettingsUpdating}
                >
                  {isSettingsUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>
                  Permanently delete your account and all of your data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
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
                <PlatformConnectDialog />
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
                  <PlatformConnectDialog trigger={
                    <Button className="mt-4">
                      Connect Platform
                    </Button>
                  } />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Social Media Platforms */}
                  <PlatformsSection 
                    title="Social Media"
                    description="Connect your social media accounts to manage all conversations in one place"
                    platformTypes={['facebook', 'instagram', 'whatsapp']}
                  />
                  
                  {/* Business Tools */}
                  <PlatformsSection 
                    title="Business Tools"
                    description="Connect your business tools and communication platforms"
                    platformTypes={['slack', 'email', 'hubspot', 'salesforce']}
                  />
                  
                  {/* Platform tips */}
                  <div className="mt-8">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex">
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
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aiModel">AI Model</Label>
                  <Select 
                    value={aiSettings.model} 
                    onValueChange={(value) => handleAISettingChange('model', value)}
                  >
                    <SelectTrigger id="aiModel">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the AI model that will be used for generating responses.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="temperature">Temperature: {aiSettings.temperature.toFixed(1)}</Label>
                    <span className="text-sm text-gray-500">{aiSettings.temperature < 0.5 ? "More precise" : aiSettings.temperature > 0.8 ? "More creative" : "Balanced"}</span>
                  </div>
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiSettings.temperature}
                    className="w-full"
                    onChange={(e) => handleAISettingChange('temperature', parseFloat(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Controls randomness: Lower values are more deterministic, higher values are more creative.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Maximum Response Length</Label>
                  <Select 
                    value={aiSettings.maxTokens.toString()} 
                    onValueChange={(value) => handleAISettingChange('maxTokens', parseInt(value))}
                  >
                    <SelectTrigger id="maxTokens">
                      <SelectValue placeholder="Select maximum tokens" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512">Short (512 tokens)</SelectItem>
                      <SelectItem value="1024">Medium (1024 tokens)</SelectItem>
                      <SelectItem value="2048">Standard (2048 tokens)</SelectItem>
                      <SelectItem value="4096">Long (4096 tokens)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum length of generated responses. Longer responses may take more time to generate.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responseTimeout">Response Timeout (seconds)</Label>
                  <Input 
                    id="responseTimeout" 
                    type="number" 
                    min="30"
                    max="300"
                    value={aiSettings.responseTimeout} 
                    onChange={(e) => handleAISettingChange('responseTimeout', parseInt(e.target.value) || 120)}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum time to wait for an AI response before timing out.
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableKnowledgeBase">Use Knowledge Base</Label>
                      <p className="text-sm text-gray-500">
                        Allow AI to use your knowledge base when generating responses.
                      </p>
                    </div>
                    <Switch
                      id="enableKnowledgeBase"
                      checked={aiSettings.enableKnowledgeBase}
                      onCheckedChange={(checked) => handleAISettingChange('enableKnowledgeBase', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="fallbackToHuman">Fallback to Human</Label>
                      <p className="text-sm text-gray-500">
                        When AI can't generate a confident response, it will notify a human agent.
                      </p>
                    </div>
                    <Switch
                      id="fallbackToHuman"
                      checked={aiSettings.fallbackToHuman}
                      onCheckedChange={(checked) => handleAISettingChange('fallbackToHuman', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setAISettings(defaultAISettings)}
              >
                Reset to Default
              </Button>
              <Button 
                onClick={saveAISettings}
                disabled={isSettingsUpdating}
              >
                {isSettingsUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive important notifications via email.
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationSettingChange('emailNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="desktopNotifications">Desktop Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive browser notifications when you're online.
                    </p>
                  </div>
                  <Switch
                    id="desktopNotifications"
                    checked={notificationSettings.desktopNotifications}
                    onCheckedChange={(checked) => handleNotificationSettingChange('desktopNotifications', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newMessageAlerts">New Message Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Get notified when new messages arrive from connected platforms.
                    </p>
                  </div>
                  <Switch
                    id="newMessageAlerts"
                    checked={notificationSettings.newMessageAlerts}
                    onCheckedChange={(checked) => handleNotificationSettingChange('newMessageAlerts', checked)}
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
                    onCheckedChange={(checked) => handleNotificationSettingChange('assignmentNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="summaryReports">Summary Reports</Label>
                    <p className="text-sm text-gray-500">
                      Receive weekly summary reports of platform activity.
                    </p>
                  </div>
                  <Switch
                    id="summaryReports"
                    checked={notificationSettings.summaryReports}
                    onCheckedChange={(checked) => handleNotificationSettingChange('summaryReports', checked)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setNotificationSettings(defaultNotificationSettings)}
              >
                Reset to Default
              </Button>
              <Button 
                onClick={saveNotificationSettings}
                disabled={isSettingsUpdating}
              >
                {isSettingsUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Manage your subscription and billing information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Current Plan: <span className="text-primary-600">Pro</span></h3>
                    <p className="text-sm text-gray-500">Your subscription renews on June 15, 2025</p>
                  </div>
                  <Button variant="outline">Manage Subscription</Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-center text-lg">Basic</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold">$29</div>
                      <div className="text-sm text-gray-500">per month</div>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>5 social accounts</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>2 team members</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Basic AI responses</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant="outline">Downgrade</Button>
                  </CardFooter>
                </Card>
                
                <Card className="border-primary-200 bg-primary-50">
                  <CardHeader className="pb-2">
                    <div className="text-center text-xs font-medium uppercase text-primary-600 mb-1">Current Plan</div>
                    <CardTitle className="text-center text-lg">Pro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold">$79</div>
                      <div className="text-sm text-gray-500">per month</div>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>25 social accounts</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>10 team members</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Advanced AI capabilities</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Analytics dashboards</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" disabled>Current Plan</Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-center text-lg">Enterprise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold">$249</div>
                      <div className="text-sm text-gray-500">per month</div>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Unlimited social accounts</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Unlimited team members</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Advanced AI & custom training</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span>Dedicated support</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Upgrade</Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

import { 
  SiFacebook, 
  SiInstagram, 
  SiWhatsapp,
  SiSlack,
  SiHubspot,
  SiZendesk,
  SiSalesforce
} from "react-icons/si";