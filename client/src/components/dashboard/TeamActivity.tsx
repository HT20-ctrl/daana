import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

interface Activity {
  id: number;
  actor: TeamMember;
  action: string;
  target?: string;
  timestamp: Date;
}

interface TeamActivityProps {
  activities: Activity[];
  isLoading: boolean;
}

export default function TeamActivity({ activities = [], isLoading }: TeamActivityProps) {
  // Helper to format relative time
  const getRelativeTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Card className="shadow rounded-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "1000ms" }}>
      <CardHeader className="px-4 py-5 sm:px-6">
        <CardTitle className="text-lg font-medium leading-6 text-gray-900">Team Activity</CardTitle>
        <CardDescription className="mt-1 max-w-2xl text-sm text-gray-500">
          Recent actions by team members.
        </CardDescription>
      </CardHeader>
      <CardContent className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-500">No recent team activity.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-start">
                <div className="flex-shrink-0">
                  <img 
                    className="h-8 w-8 rounded-full object-cover" 
                    src={activity.actor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.actor.name)}`} 
                    alt={`${activity.actor.name}'s profile picture`} 
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.actor.name}</span>{" "}
                    {activity.action}
                    {activity.target && <span className="font-medium"> {activity.target}</span>}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{getRelativeTime(activity.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <Link href="/analytics" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            View all activity
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
