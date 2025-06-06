import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Validation schema
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Parse URL parameters
  const params = new URLSearchParams(location.split('?')[1] || '');
  const verified = params.get('verified') === 'true';
  const verificationError = params.get('verificationError') === 'true';
  
  // Initialize form
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Handle sign-in mutation
  const signInMutation = useMutation({
    mutationFn: async (formData: SignInFormValues) => {
      const response = await apiRequest('POST', '/api/auth/signin', formData);
      return response.json();
    },
    onSuccess: (data) => {
      // Store the token in localStorage
      localStorage.setItem('authToken', data.token);
      
      // Store organization context if available
      if (data.currentOrganization) {
        localStorage.setItem('currentOrganizationId', data.currentOrganization.id);
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
        variant: "default"
      });
      
      // Redirect to the dashboard
      navigate('/app/dashboard');
    },
    onError: (error: any) => {
      console.error('Sign-in error:', error);
      setAuthError(error.message || 'Invalid email or password');
      
      toast({
        title: "Sign-in failed",
        description: error.message || "There was an error signing in. Please check your credentials.",
        variant: "destructive"
      });
    }
  });

  // Form submission handler
  const onSubmit = (values: SignInFormValues) => {
    setAuthError(null);
    signInMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-blue-900/70 to-indigo-950/80"></div>
      <div className="absolute inset-0 backdrop-blur-[120px] bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
      
      {/* Animated gradient circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full filter blur-3xl opacity-25 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full filter blur-3xl opacity-25 animate-blob animation-delay-4000"></div>
      
      {/* Navigation */}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 p-[2px] overflow-hidden group transform transition-all duration-300 hover:scale-110">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-800/80 to-indigo-900/80 backdrop-blur-xl flex items-center justify-center transition group-hover:from-blue-700/80 group-hover:to-indigo-800/80">
                <span className="text-white font-bold text-xl group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-blue-300 transition-all duration-300">D</span>
              </div>
            </div>
            <span className="font-bold text-2xl bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">Dana AI</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="/"
              className="text-sm font-medium relative overflow-hidden group"
            >
              <span className="relative z-10 text-white group-hover:text-white transition-colors duration-300">Back to Home</span>
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
            </a>
          </div>
        </div>
      </div>
      
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 p-[2px] overflow-hidden group transform transition-all duration-300">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-800/80 to-indigo-900/80 backdrop-blur-xl flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">D</span>
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
              Sign in to Dana AI
            </CardTitle>
            <CardDescription className="text-center text-white/70">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verified && (
              <Alert className="mb-4 bg-green-400/20 border-green-400/30 text-green-200">
                <AlertDescription>
                  Your email has been successfully verified. Please sign in to continue.
                </AlertDescription>
              </Alert>
            )}
            
            {verificationError && (
              <Alert className="mb-4 bg-amber-400/20 border-amber-400/30 text-amber-200">
                <AlertDescription>
                  Email verification failed. Please try again or contact support.
                </AlertDescription>
              </Alert>
            )}
            
            {authError && (
              <Alert className="mb-4 bg-red-400/20 border-red-400/30 text-red-200">
                <AlertDescription>
                  {authError}
                </AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="you@example.com" 
                          {...field} 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                      </FormControl>
                      <FormMessage className="text-red-200" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••" 
                            {...field}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10" 
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/70 hover:text-white"
                          >
                            {showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-200" />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-end">
                  <a 
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-200 hover:text-blue-100"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/forgot-password');
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                  disabled={signInMutation.isPending}
                >
                  {signInMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-white/60">Or continue with</span>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" type="button" className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 mr-2 text-white">
                    <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </Button>
                <Button variant="outline" type="button" className="h-10 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-white/70">
              Don't have an account?{" "}
              <a 
                href="/signup" 
                className="font-medium text-blue-200 hover:text-blue-100"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/signup');
                }}
              >
                Sign up
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}