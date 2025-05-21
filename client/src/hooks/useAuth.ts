import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useCachedQuery } from "./useCachedQuery";

/**
 * Hook for accessing the authenticated user and authentication status
 * 
 * Features:
 * - Provides the current user and authentication status
 * - Automatically handles loading states
 * - Includes login/logout helper functions
 * 
 * @returns Object with user data and authentication helpers
 */
export function useAuth() {
  const { 
    data: user, 
    isLoading, 
    error,
    refetch
  } = useCachedQuery<User>(["/api/auth/user"], {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });

  const login = () => {
    // Using a direct navigation here as per Replit Auth requirements
    window.location.href = "/api/login";
  };

  const logout = () => {
    // Using a direct navigation here as per Replit Auth requirements
    window.location.href = "/api/logout";
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser: refetch
  };
}
