import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import { User } from "@shared/schema";

// Layout
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

// Pages
import Dashboard from "@/pages/dashboard";
import Conversations from "@/pages/conversations";
import KnowledgeBase from "@/pages/knowledge-base";
import AiResponses from "@/pages/ai-responses";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Search from "@/pages/search";
import NotFound from "@/pages/not-found";
import GoogleAuthPage from "@/pages/google-auth";
import LandingPage from "@/pages/landing";
import SignInPage from "@/pages/signin";

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
    updatedAt: new Date()
  };

  // Use demo user if not authenticated
  const currentUser = isAuthenticated ? (user as User) : demoUser;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <Switch>
            <Route path="/app/conversations">
              <Conversations />
            </Route>
            <Route path="/app/knowledge-base">
              <KnowledgeBase />
            </Route>
            <Route path="/app/ai-responses">
              <AiResponses />
            </Route>
            <Route path="/app/analytics">
              <Analytics />
            </Route>
            <Route path="/app/settings">
              <Settings />
            </Route>
            <Route path="/app/search">
              <Search />
            </Route>
            <Route>
              <Dashboard />
            </Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}

// Authentication-aware router
function AuthRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Switch>
      <Route path="/google-auth">
        <GoogleAuthPage />
      </Route>
      <Route path="/signin">
        <SignInPage />
      </Route>
      <Route path="/app/:path*">
        <MainApp />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
