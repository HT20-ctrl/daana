import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./useAuth";

// Types for organization data
export interface Organization {
  id: string;
  name: string;
  plan: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

// Context type definition
type OrganizationContextType = {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrganization: (organizationId: string) => void;
};

// Create the context
export const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  organizations: [],
  isLoading: true,
  switchOrganization: () => {},
});

// Context provider component
export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  
  // Fetch user's organizations
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["/api/organizations"],
    enabled: isAuthenticated,
  });
  
  // Set the first organization as default when organizations load
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      setCurrentOrganization(organizations[0]);
      
      // Store the current organization ID in localStorage
      localStorage.setItem("currentOrganizationId", organizations[0].id);
    }
  }, [organizations, currentOrganization]);
  
  // When component mounts, try to restore the last selected organization from localStorage
  useEffect(() => {
    if (organizations.length > 0) {
      const savedOrgId = localStorage.getItem("currentOrganizationId");
      
      if (savedOrgId) {
        const savedOrg = organizations.find(org => org.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrganization(savedOrg);
        } else {
          // If saved org not found, use the first available
          setCurrentOrganization(organizations[0]);
          localStorage.setItem("currentOrganizationId", organizations[0].id);
        }
      }
    }
  }, [organizations]);
  
  // Function to switch between organizations
  const switchOrganization = (organizationId: string) => {
    const newOrg = organizations.find(org => org.id === organizationId);
    if (newOrg) {
      setCurrentOrganization(newOrg);
      localStorage.setItem("currentOrganizationId", organizationId);
      
      // Optionally: reload data that depends on organization context
      // queryClient.invalidateQueries(["/api/platforms"]);
      // queryClient.invalidateQueries(["/api/conversations"]);
      // etc.
    }
  };
  
  // Provide context to children
  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        isLoading,
        switchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

// Custom hook to use organization context
export const useOrganizationContext = () => useContext(OrganizationContext);