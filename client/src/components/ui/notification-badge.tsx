import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Bell,
  X
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

type Notification = {
  id: string;
  type: string;
  data: {
    title: string;
    message: string;
    link?: string;
  };
  createdAt: string;
  read: boolean;
};

export function NotificationBadge() {
  const { data: notifications = [], refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    retry: false
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, "POST");
      
      // Refresh the notifications list
      refetch();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative p-2 h-9 w-9">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto p-0">
        <div className="p-4 font-medium">Notifications</div>
        <Separator />
        {notifications.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No notifications
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={cn(
                  "p-4 flex flex-col hover:bg-muted/50 transition-colors",
                  !notification.read && "bg-blue-50 dark:bg-blue-950/10"
                )}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-medium">{notification.data.title}</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <X size={14} />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{notification.data.message}</p>
                {notification.data.link && (
                  <a 
                    href={notification.data.link} 
                    className="text-sm text-blue-600 dark:text-blue-400 mt-2 hover:underline"
                  >
                    View details
                  </a>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}