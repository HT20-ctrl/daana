import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

/**
 * Global error boundary to wrap the entire application
 * Provides navigation options to recover from errors
 */
const GlobalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const handleReset = () => {
    // Navigate to homepage when resetting from a global error
    navigate('/');
  };

  // Custom fallback UI for global errors
  const fallback = (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-muted-foreground">
            We're sorry, but something unexpected happened.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full" 
            onClick={() => window.location.reload()}
            variant="default"
          >
            Reload page
          </Button>
          
          <Button 
            className="w-full" 
            onClick={() => navigate('/')}
            variant="outline"
          >
            Go to homepage
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onReset={handleReset}>
      {children}
    </ErrorBoundary>
  );
};

export default GlobalErrorBoundary;