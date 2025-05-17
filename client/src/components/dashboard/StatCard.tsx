import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBackground: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  delay?: number;
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  iconBackground, 
  change, 
  delay = 0 
}: StatCardProps) {
  return (
    <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBackground} rounded-md p-3`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className={`text-xs ${change.isPositive ? 'text-green-500' : 'text-red-500'} flex items-center mt-1`}>
                    {change.isPositive ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />}
                    <span>{change.value}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
