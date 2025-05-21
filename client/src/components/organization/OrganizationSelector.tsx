import React from 'react';
import { Check, ChevronDown, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function OrganizationSelector() {
  const { currentOrganization, organizations, switchOrganization } = useOrganizationContext();

  if (!currentOrganization || organizations.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2 py-1.5 h-auto">
          <Avatar className="h-6 w-6">
            {currentOrganization.logo ? (
              <AvatarImage src={currentOrganization.logo} alt={currentOrganization.name} />
            ) : (
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-700">
                {currentOrganization.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium hidden md:inline-block">
            {currentOrganization.name}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <h4 className="text-xs font-medium text-muted-foreground mb-1 px-2 py-1.5">
          Your Organizations
        </h4>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.id)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              currentOrganization.id === org.id && "bg-accent"
            )}
          >
            <Avatar className="h-6 w-6">
              {org.logo ? (
                <AvatarImage src={org.logo} alt={org.name} />
              ) : (
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-700">
                  {org.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-sm">{org.name}</span>
            {currentOrganization.id === org.id && (
              <Check className="h-4 w-4 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building className="h-3 w-3" />
            {currentOrganization.plan.charAt(0).toUpperCase() + currentOrganization.plan.slice(1)} Plan
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}