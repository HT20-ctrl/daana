import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Conversation, KnowledgeBase } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Clock, FileText, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  type: 'conversation' | 'knowledge';
  id: number;
  title: string;
  subtitle?: string;
  highlight?: string;
  date?: Date;
}

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentTab, setCurrentTab] = useState("all");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Fetch necessary data for search
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  const { data: knowledgeBase, isLoading: knowledgeBaseLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ['/api/knowledge-base'],
  });
  
  // Process search when query changes
  useEffect(() => {
    if (!searchQuery) return;
    
    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase();
    
    // Filter results based on tab
    if (currentTab === "all" || currentTab === "conversations") {
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
              highlight: conversation.lastMessage || '',
              date: conversation.lastMessageAt || undefined
            });
          }
        });
      }
    }
    
    if (currentTab === "all" || currentTab === "knowledge") {
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
              highlight,
              date: item.updatedAt || undefined
            });
          }
        });
      }
    }
    
    setSearchResults(results);
  }, [searchQuery, conversations, knowledgeBase, currentTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'conversation') {
      window.location.href = `/conversations/${result.id}`;
    } else if (result.type === 'knowledge') {
      window.location.href = `/knowledge-base/${result.id}`;
    }
  };

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const isLoading = conversationsLoading || knowledgeBaseLoading;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Search Results</h1>
      
      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input 
            type="text" 
            className="pl-10 py-3" 
            placeholder="Search for conversations, messages, or knowledge base articles..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>
      
      {/* Results tabs */}
      <Tabs
        defaultValue="all"
        className="mb-6"
        value={currentTab}
        onValueChange={setCurrentTab}
      >
        <TabsList>
          <TabsTrigger value="all">All Results</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        Found {searchResults.length} results for "{searchQuery}"
      </p>
      
      {/* Results list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4 mb-1" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          {searchResults.map((result, index) => (
            <div 
              key={`${result.type}-${result.id}-${index}`}
              className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 cursor-pointer transition"
              onClick={() => handleResultClick(result)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1 mr-3">
                  {result.type === 'conversation' ? (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{result.title}</h3>
                    {result.date && (
                      <span className="text-sm text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(result.date)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{result.subtitle}</p>
                  {result.highlight && (
                    <p className="text-sm text-gray-700 mt-2">
                      {result.highlight}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
          <p className="text-gray-500">
            We couldn't find any matches for "{searchQuery}"
          </p>
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-2">Suggestions:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your spelling</li>
              <li>• Try more general keywords</li>
              <li>• Try different keywords</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Enter a search term to find conversations and knowledge base articles
          </p>
        </div>
      )}
    </div>
  );
}