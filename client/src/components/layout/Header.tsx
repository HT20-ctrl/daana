import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, HelpCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasNotifications, setHasNotifications] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    // Implementation for search functionality would go here
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-4">
        {/* Mobile view shows the app name */}
        <h1 className="text-xl font-semibold text-gray-900 md:hidden">Dana AI</h1>
        
        {/* Search bar - hidden on small screens */}
        <div className="hidden md:block flex-1 max-w-3xl mx-auto px-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2" 
                placeholder="Search for conversations, messages, or contacts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center ml-4 space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="relative text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={() => setHasNotifications(!hasNotifications)}
          >
            <Bell className="h-5 w-5" />
            {hasNotifications && (
              <Badge 
                className="absolute top-0 right-0 h-2 w-2 p-0 rounded-full bg-red-500 border-0"
                aria-label="New notifications"
              />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
