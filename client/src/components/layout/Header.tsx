import { useState, useEffect } from "react";
import { User, Conversation, Message, KnowledgeBase } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, HelpCircle, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "../../hooks/use-debounce";

interface SearchResult {
  type: 'conversation' | 'message' | 'knowledge';
  id: number;
  title: string;
  subtitle?: string;
  highlight?: string;
}

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasNotifications, setHasNotifications] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [_, navigate] = useLocation();

  // Fetch necessary data for search
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    enabled: debouncedSearchQuery.length > 0,
  });

  const { data: knowledgeBase } = useQuery<KnowledgeBase[]>({
    queryKey: ['/api/knowledge-base'],
    enabled: debouncedSearchQuery.length > 0,
  });

  useEffect(() => {
    if (debouncedSearchQuery.length > 0) {
      setIsSearching(true);
      
      // Perform search
      const results: SearchResult[] = [];
      const query = debouncedSearchQuery.toLowerCase();
      
      // Search conversations
      if (conversations) {
        conversations.forEach(conversation => {
          if (
            conversation.customerName.toLowerCase().includes(query) || 
            (conversation.lastMessage && conversation.lastMessage.toLowerCase().includes(query))
          ) {
            results.push({
              type: 'conversation',
              id: conversation.id,
              title: conversation.customerName,
              subtitle: 'Conversation',
              highlight: conversation.lastMessage || ''
            });
          }
        });
      }
      
      // Search knowledge base
      if (knowledgeBase) {
        knowledgeBase.forEach(item => {
          if (
            item.fileName.toLowerCase().includes(query) || 
            (item.content && item.content.toLowerCase().includes(query))
          ) {
            // Find matching excerpt
            let highlight = '';
            if (item.content) {
              const contentLower = item.content.toLowerCase();
              const index = contentLower.indexOf(query);
              if (index > -1) {
                const start = Math.max(0, index - 30);
                const end = Math.min(item.content.length, index + query.length + 30);
                highlight = '...' + item.content.substring(start, end) + '...';
              }
            }
            
            results.push({
              type: 'knowledge',
              id: item.id,
              title: item.fileName,
              subtitle: 'Knowledge Base',
              highlight
            });
          }
        });
      }
      
      setSearchResults(results);
      setIsSearching(false);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearchQuery, conversations, knowledgeBase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() === '') return;
    
    // Navigate to search results page with the query
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    setShowResults(false);
  };

  // Handle clicking on a search result
  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    
    if (result.type === 'conversation') {
      navigate(`/conversations/${result.id}`);
    } else if (result.type === 'knowledge') {
      navigate(`/knowledge-base/${result.id}`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-4">
        {/* Mobile view shows the app name */}
        <h1 className="text-xl font-semibold text-gray-900 md:hidden">Dana AI</h1>
        
        {/* Search bar - hidden on small screens */}
        <div className="hidden md:block flex-1 max-w-3xl mx-auto px-4">
          <div className="relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input 
                  type="text" 
                  className="block w-full pl-10 pr-10 py-2" 
                  placeholder="Search for conversations, messages, or contacts..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowResults(true);
                    }
                  }}
                  onBlur={() => {
                    // Delayed hide to allow click on results
                    setTimeout(() => setShowResults(false), 150);
                  }}
                />
                {searchQuery && (
                  <div 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowResults(false);
                    }}
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </div>
                )}
              </div>
            </form>
            
            {/* Search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                <div className="p-2 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div 
                      key={`${result.type}-${result.id}-${index}`}
                      className="py-2 px-3 hover:bg-gray-50 cursor-pointer rounded-md"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          {result.type === 'conversation' ? (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-xs">C</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-purple-600 text-xs">K</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">{result.title}</p>
                          <p className="text-xs text-gray-500">{result.subtitle}</p>
                          {result.highlight && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {result.highlight}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-2 text-xs text-center border-t border-gray-100">
                  Press Enter to see all results
                </div>
              </div>
            )}
            
            {/* No results state */}
            {showResults && searchQuery.length > 0 && searchResults.length === 0 && !isSearching && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-600">No results found for "{searchQuery}"</p>
                </div>
              </div>
            )}
          </div>
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
