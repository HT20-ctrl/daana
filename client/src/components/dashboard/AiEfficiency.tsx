import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface AiEfficiencyProps {
  percentage: number;
  aiMessages: number;
  totalMessages: number;
  responseTime: string;
  satisfaction: string;
  escalationRate: string;
  model: string;
}

export default function AiEfficiency({
  percentage,
  aiMessages,
  totalMessages,
  responseTime,
  satisfaction,
  escalationRate,
  model
}: AiEfficiencyProps) {
  // Calculate the stroke-dashoffset for the circle
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (circumference * percentage) / 100;

  return (
    <Card className="shadow rounded-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "800ms" }}>
      <CardHeader className="px-4 py-5 sm:px-6">
        <CardTitle className="text-lg font-medium leading-6 text-gray-900">AI Efficiency</CardTitle>
        <CardDescription className="mt-1 max-w-2xl text-sm text-gray-500">
          How effectively AI is handling your conversations.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex flex-col items-center">
          <div className="relative h-36 w-36">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="#2563eb" 
                strokeWidth="10" 
                strokeDasharray={circumference} 
                strokeDashoffset={offset} 
                transform="rotate(-90 50 50)"
              />
              <text 
                x="50" 
                y="50" 
                fontSize="20" 
                textAnchor="middle" 
                alignmentBaseline="middle" 
                fill="#2563eb" 
                fontWeight="bold"
              >
                {percentage}%
              </text>
            </svg>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-gray-900">
              {aiMessages} out of {totalMessages} messages handled by AI
            </p>
          </div>
        </div>
        <div className="mt-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Average Response Time</dt>
              <dd className="mt-1 text-sm text-gray-900">{responseTime}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Customer Satisfaction</dt>
              <dd className="mt-1 text-sm text-gray-900">{satisfaction}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Human Escalations</dt>
              <dd className="mt-1 text-sm text-gray-900">{escalationRate}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">AI Model</dt>
              <dd className="mt-1 text-sm text-gray-900">{model}</dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
