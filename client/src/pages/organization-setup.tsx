import React from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Organization setup validation schema
const organizationSchema = z.object({
  name: z.string().min(3, 'Organization name is required and must be at least 3 characters'),
  industry: z.string().optional(),
  size: z.string().optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

export default function OrganizationSetupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Initialize form
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      industry: '',
      size: '',
      plan: 'professional',
    }
  });

  // Handle organization creation mutation
  const createOrgMutation = useMutation({
    mutationFn: async (formData: OrganizationFormValues) => {
      const response = await apiRequest('POST', '/api/organizations', formData);
      return response.json();
    },
    onSuccess: (data) => {
      // Save the organization ID as current in localStorage
      localStorage.setItem('currentOrganizationId', data.id);
      
      toast({
        title: "Organization created!",
        description: "Your organization has been set up successfully.",
        variant: "success"
      });
      
      // Navigate to the dashboard
      navigate('/app/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Organization setup failed",
        description: error.message || "There was an error creating your organization.",
        variant: "destructive"
      });
    }
  });

  // Form submission handler
  const onSubmit = (values: OrganizationFormValues) => {
    createOrgMutation.mutate(values);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold bg-gradient-to-br from-blue-600 to-indigo-800 bg-clip-text text-transparent">
            Create Your Organization
          </CardTitle>
          <CardDescription className="text-center">
            Let's set up your organization to help you manage your teams and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company Name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This will be the primary identifier for your organization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optional
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Size</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501+">501+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optional
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Select a Plan</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-3"
                      >
                        <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="basic" id="basic" />
                          <div className="grid gap-1.5">
                            <Label htmlFor="basic" className="font-medium">Basic</Label>
                            <p className="text-sm text-gray-500">
                              Perfect for individuals or small teams. Limited features.
                            </p>
                          </div>
                          <div className="ml-auto">
                            <span className="text-lg font-bold">$9</span>
                            <span className="text-sm text-gray-500">/month</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer border-blue-200 bg-blue-50">
                          <RadioGroupItem value="professional" id="professional" />
                          <div className="grid gap-1.5">
                            <Label htmlFor="professional" className="font-medium">Professional</Label>
                            <p className="text-sm text-gray-500">
                              Full features for growing teams with advanced needs.
                            </p>
                          </div>
                          <div className="ml-auto">
                            <span className="text-lg font-bold">$29</span>
                            <span className="text-sm text-gray-500">/month</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="enterprise" id="enterprise" />
                          <div className="grid gap-1.5">
                            <Label htmlFor="enterprise" className="font-medium">Enterprise</Label>
                            <p className="text-sm text-gray-500">
                              Custom solutions for large organizations with unique requirements.
                            </p>
                          </div>
                          <div className="ml-auto">
                            <span className="text-lg font-bold">$99</span>
                            <span className="text-sm text-gray-500">/month</span>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                disabled={createOrgMutation.isPending}
              >
                {createOrgMutation.isPending ? "Creating Organization..." : "Create Organization"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500">
          This will be your default organization. You can create or join additional organizations later.
        </CardFooter>
      </Card>
    </div>
  );
}