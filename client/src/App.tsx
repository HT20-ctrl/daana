import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import { User } from "@shared/schema";
import { lazy, Suspense } from "react";

// Layout
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

// Loading component for lazy loading
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Conversations = lazy(() => import("@/pages/conversations"));
const KnowledgeBase = lazy(() => import("@/pages/knowledge-base"));
const AiResponses = lazy(() => import("@/pages/ai-responses"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Settings = lazy(() => import("@/pages/settings"));
const Search = lazy(() => import("@/pages/search"));
const NotFound = lazy(() => import("@/pages/not-found"));
const GoogleAuthPage = lazy(() => import("@/pages/google-auth"));
const LandingPage = lazy(() => import("@/pages/landing"));
const SignInPage = lazy(() => import("@/pages/signin"));
const ConversationDetail = lazy(() => import("@/pages/conversation-detail"));

// Auth loading screen
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary-600 border-t-transparent animate-spin mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900">Loading Dana AI Platform...</h1>
      </div>
    </div>
  );
}

// Main app with auth checking
function MainApp() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Demo mode - don't redirect to login immediately
  // This allows us to at least see the UI
  const demoUser: User = {
    id: "demo-user",
    email: "demo@example.com",
    firstName: "Demo",
    lastName: "User",
    profileImageUrl: null,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    userSettings: {
      aiSettings: {
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 2048,
        responseTimeout: 30000,
        enableKnowledgeBase: true,
        fallbackToHuman: true
      },
      notificationSettings: {
        emailNotifications: true,
        desktopNotifications: true,
        newMessageAlerts: true,
        assignmentNotifications: true,
        summaryReports: true
      }
    }
  };

  // Use demo user if not authenticated
  const currentUser = isAuthenticated ? (user as User) : demoUser;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {/* PageSkeleton component for nicer loading experience */}
          <Suspense fallback={
            <div className="space-y-6 w-full">
              <Skeleton className="h-8 w-2/3 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-48 rounded-lg" />
              </div>
              <div className="space-y-4 mt-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
          }>
            <Switch>
              <Route path="/app/conversations/:id" component={ConversationDetail} />
              <Route path="/app/conversations" component={Conversations} />
              <Route path="/app/knowledge-base" component={KnowledgeBase} />
              <Route path="/app/ai-responses" component={AiResponses} />
              <Route path="/app/analytics" component={Analytics} />
              <Route path="/app/settings" component={Settings} />
              <Route path="/app/search" component={Search} />
              <Route component={Dashboard} />
            </Switch>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Authentication-aware router
function AuthRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // Check if the path starts with /app to handle all app routes
  if (location.startsWith('/app')) {
    return <MainApp />;
  }
  
  return (
    <Switch>
      <Route path="/google-auth">
        <GoogleAuthPage />
      </Route>
      <Route path="/signin">
        <SignInPage />
      </Route>
      <Route path="/dashboard">
        <MainApp />
      </Route>
      <Route path="/landing">
        <LandingPage />
      </Route>
      <Route path="/">
        <LandingPage />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

// Import the error boundary component
import GlobalErrorBoundary from "./components/error-handling/GlobalErrorBoundary";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <GlobalErrorBoundary>
            <Toaster />
            <AuthRouter />
          </GlobalErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
