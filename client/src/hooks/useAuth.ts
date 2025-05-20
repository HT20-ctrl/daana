import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Use a proper error handler to prevent "unexpected token doctype" errors
    onError: (err) => {
      console.error("Authentication error:", err);
    },
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}
