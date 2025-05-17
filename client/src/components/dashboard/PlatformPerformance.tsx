import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PlatformMetric {
  day: string;
  value: number;
}

interface PlatformPerformanceProps {
  data: PlatformMetric[];
  onTimeRangeChange: (range: string) => void;
}

export default function PlatformPerformance({ 
  data,
  onTimeRangeChange
}: PlatformPerformanceProps) {
  return (
    <Card className="shadow rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "500ms" }}>
      <CardHeader className="px-4 py-5 sm:px-6 flex justify-between items-center flex-wrap sm:flex-nowrap gap-4">
        <CardTitle className="text-lg font-medium leading-6 text-gray-900">Platform Performance</CardTitle>
        <div>
          <Select defaultValue="7days" onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-5">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="day" />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center space-x-8 mt-4">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-sm text-gray-600">Message Volume</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
