import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

type OrganizationContextType = {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrganization: (organizationId: string) => void;
};

export const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  organizations: [],
  isLoading: true,
  switchOrganization: () => {},
});

// Helper function to get/set the current organization ID in local storage
export const getCurrentOrganizationId = (): string | null => {
  return localStorage.getItem('currentOrganizationId');
};

const setCurrentOrganizationId = (organizationId: string): void => {
  localStorage.setItem('currentOrganizationId', organizationId);
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const queryClient = useQueryClient();
  const [currentOrganizationId, setOrgId] = useState<string | null>(getCurrentOrganizationId());
  
  // Fetch all organizations the user belongs to
  const { data, isLoading } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Ensure we always have an array even if the API returns null/undefined
  const organizations = data || [];
  
  // Set default organization on first load if none is selected
  useEffect(() => {
    if (!isLoading && organizations.length > 0 && !currentOrganizationId) {
      const defaultOrg = organizations[0];
      setOrgId(defaultOrg.id);
      setCurrentOrganizationId(defaultOrg.id);
    }
  }, [organizations, isLoading, currentOrganizationId]);
  
  // Find the current organization object
  const currentOrganization = organizations.find(org => org.id === currentOrganizationId) || null;
  
  // Handle switching between organizations
  const switchOrganization = (organizationId: string) => {
    if (organizationId !== currentOrganizationId) {
      setOrgId(organizationId);
      setCurrentOrganizationId(organizationId);
      
      // Invalidate all queries to refetch data for the new organization
      queryClient.invalidateQueries();
    }
  };
  
  const contextValue: OrganizationContextType = {
    currentOrganization,
    organizations,
    isLoading,
    switchOrganization,
  };
  
  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganizationContext = () => useContext(OrganizationContext);