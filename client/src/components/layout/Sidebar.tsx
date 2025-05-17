import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  BookText,
  Bot,
  BarChart2,
  Settings,
  LogOut
} from "lucide-react";
import { SiFacebook, SiInstagram, SiWhatsapp, SiSlack, SiGmail, SiHubspot } from "react-icons/si";
import UserDropdown from "@/components/shared/UserDropdown";
import { useState, useEffect } from "react";

interface SidebarProps {
  user: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close sidebar on location change in mobile view
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [location]);

  // Handle mobile toggle
  useEffect(() => {
    const toggleButton = document.getElementById('sidebar-toggle');
    
    if (toggleButton) {
      const handleClick = () => {
        setIsMobileOpen(prev => !prev);
      };
      
      toggleButton.addEventListener('click', handleClick);
      
      return () => {
        toggleButton.removeEventListener('click', handleClick);
      };
    }
  }, []);

  const navItems = [
    { href: "/", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
    { href: "/conversations", icon: <MessageSquare className="h-5 w-5" />, label: "Conversations" },
    { href: "/ai-responses", icon: <Bot className="h-5 w-5" />, label: "AI Responses" },
    { href: "/knowledge-base", icon: <BookText className="h-5 w-5" />, label: "Knowledge Base" },
    { href: "/analytics", icon: <BarChart2 className="h-5 w-5" />, label: "Analytics" },
    { href: "/settings", icon: <Settings className="h-5 w-5" />, label: "Settings" }
  ];

  const socialPlatforms = [
    { icon: <SiFacebook className="h-5 w-5 text-blue-600" />, label: "Facebook" },
    { icon: <SiInstagram className="h-5 w-5 text-pink-600" />, label: "Instagram" },
    { icon: <SiWhatsapp className="h-5 w-5 text-green-500" />, label: "WhatsApp" }
  ];

  const businessTools = [
    { icon: <SiSlack className="h-5 w-5 text-purple-500" />, label: "Slack" },
    { icon: <SiGmail className="h-5 w-5 text-blue-500" />, label: "Email" },
    { icon: <SiHubspot className="h-5 w-5 text-orange-500" />, label: "HubSpot" }
  ];

  const sidebarClasses = cn(
    "bg-white border-r border-gray-200 transition-all duration-300",
    "flex flex-col",
    isMobileOpen 
      ? "fixed inset-y-0 left-0 z-50 w-64" 
      : "hidden md:flex md:w-64"
  );

  return (
    <aside className={sidebarClasses}>
      {/* Logo and branding */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl font-bold">D</span>
          </div>
          <h1 className="ml-3 text-xl font-semibold text-gray-900">Dana AI</h1>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              location === item.href
                ? "bg-primary-50 text-primary-700"
                : "text-gray-700 hover:bg-gray-100"
            )}>
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </a>
          </Link>
        ))}

        {/* Connected Platforms Section */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Connected Platforms
          </h3>
          <div className="mt-2 space-y-1">
            {socialPlatforms.map((platform, index) => (
              <a 
                key={index}
                href="#" 
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                {platform.icon}
                <span className="ml-3">{platform.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Business Tools Section */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Business Tools
          </h3>
          <div className="mt-2 space-y-1">
            {businessTools.map((tool, index) => (
              <a 
                key={index}
                href="#" 
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                {tool.icon}
                <span className="ml-3">{tool.label}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* User profile section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <UserDropdown user={user} />
          <a 
            href="/api/logout"
            className="ml-auto text-gray-400 hover:text-gray-500"
          >
            <LogOut className="h-5 w-5" />
          </a>
        </div>
      </div>
    </aside>
  );
}
