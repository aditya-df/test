'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Coins, Clock } from 'lucide-react'
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";

interface MonthlyData {
  month: string;  // Will contain "Month Year" format
  total: number;
}

interface WeeklyData {
  day: string;
  total: number;
}

type MonthlyMetric = 'chatbots' | 'users' | 'conversations';
type WeeklyMetric = 'avgResponseTime' | 'token';
type MetricType = MonthlyMetric | WeeklyMetric;

interface DashboardContentProps {
  totalChatbots: number;
  totalUsers: number;
  totalPrompt: number;
  totalAvgResponseTime: number;
  totalToken: number;
  totalChatbotsThisMonth: number;
  totalUsersThisMonth: number;
  totalPromptThisMonth: number;
  totalAvgResponseTimeThisWeek: number;
  totalTokenThisWeek: number;
  hasAccess: boolean;
  monthlyChartData: {
    chatbots: MonthlyData[];
    users: MonthlyData[];
    conversations: MonthlyData[];
  };
  weeklyChartData: {
    avgResponseTime: WeeklyData[];
    token: WeeklyData[];
  }
}

export default function DashboardContent({
  totalChatbots, totalUsers, totalPrompt, totalAvgResponseTime, totalToken,
  totalChatbotsThisMonth, totalUsersThisMonth, totalPromptThisMonth, totalAvgResponseTimeThisWeek, totalTokenThisWeek,
  monthlyChartData, weeklyChartData
}: DashboardContentProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getChartData = () => {
    if (!selectedMetric || !weeklyChartData || !monthlyChartData) return [];

    // Monthly metrics
    if (['chatbots', 'users', 'conversations'].includes(selectedMetric)) {
      return monthlyChartData[selectedMetric as keyof typeof monthlyChartData] || [];
    }

    // Weekly metrics
    if (selectedMetric === 'avgResponseTime' && weeklyChartData?.avgResponseTime) {
      return weeklyChartData.avgResponseTime;
    }
    if (selectedMetric === 'token' && weeklyChartData?.token) {
      return weeklyChartData.token;
    }

    return [];
  };

  const handleCardClick = (metric: MetricType) => {
    setSelectedMetric(metric);
    setDialogOpen(true);
  };

  const getDataKey = () => {
    if (['chatbots', 'users', 'conversations'].includes(selectedMetric || '')) {
      return 'month';
    }
    return 'day';
  };

  const formatTooltip = (value: number) => {
    if (selectedMetric === 'avgResponseTime') {
      // The value is already in seconds because we transformed it in weeklyAvgResponseTimes
      return [`${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })} seconds`, ''];
    }
    return [`Total: ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`, ''];
  }

  const formatXAxis = (value: string) => {
    return value;
  };

  const formatYAxis = (value: number) => {
    // if (selectedMetric === 'avgResponseTime') {
    //   return (value / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 });
    // }
    return value.toLocaleString("id-ID");
  };

  const getDialogTitle = () => {
    if (selectedMetric === 'chatbots') return 'Monthly Chatbot Creation Growth Over Time';
    if (selectedMetric === 'users') return 'Monthly Active Users Growth Over Time';
    if (selectedMetric === 'conversations') return 'Monthly Conversation Volume Over Time';
    if (selectedMetric === 'avgResponseTime') return 'Weekly Average Response Time Over Time';
    if (selectedMetric === 'token') return 'Weekly Token Usage Over Time';
    return '';
  };

  const getDialogDescription = () => {
    if (selectedMetric === 'chatbots') return 'This chart shows the number of chatbots created in this year by your agent/datasource';
    if (selectedMetric === 'users') return 'This chart shows the number of active users in this year by your agent/datasource';
    if (selectedMetric === 'conversations') return 'This chart shows the number of conversations in this year by your agent/datasource';
    if (selectedMetric === 'avgResponseTime') return 'This chart shows the average response time in this week by your agent/datasource';
    if (selectedMetric === 'token') return 'This chart shows the token usage in this week by by your agent/datasource';
    return '';
  }

  const getYAxisLabel = () => {
    if (selectedMetric === 'chatbots') return 'Number of Chatbots';
    if (selectedMetric === 'users') return 'Number of Users';
    if (selectedMetric === 'conversations') return 'Number of Conversations';
    if (selectedMetric === 'avgResponseTime') return 'Average Response Time (seconds)';
    if (selectedMetric === 'token') return 'Token Usage';
    return '';
  };

  return (
    <div className="flex justify-center pt-6 px-8 h-[calc(100vh-210px)]">
      <div className="w-full">
        <Card className="rounded-lg border-none w-full max-w-7xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                onClick={() => handleCardClick('chatbots')}
              >
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Total Chatbots</CardTitle>
                  <Icons.BotIcon className="h-6 w-6 mt-2 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-between">
                  <div className="text-3xl font-bold">{totalChatbots === 0 ? 1 : totalChatbots}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">+{totalChatbotsThisMonth} since last month</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                onClick={() => handleCardClick('users')}
              >
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Active Users</CardTitle>
                  <Icons.UsersIcon className="h-6 w-6 mt-2 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-between">
                  <div className="text-3xl font-bold">{totalUsers}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">+{totalUsersThisMonth} since last month</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                onClick={() => handleCardClick('conversations')}
              >
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Conversations</CardTitle>
                  <Icons.MessageCircleIcon className="h-6 w-6 mt-2 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-between">
                  <div className="text-3xl font-bold">{totalPrompt}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">+{totalPromptThisMonth} since last month</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                onClick={() => handleCardClick('avgResponseTime' as MetricType)}
              >
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Average Response Time (second)</CardTitle>
                  <Clock className="h-6 w-6 mt-2 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-between">
                  <div className="text-3xl font-bold">{(totalAvgResponseTime / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">+{(totalAvgResponseTimeThisWeek / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} since last week</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                onClick={() => handleCardClick('token' as MetricType)}
              >
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Token Usage</CardTitle>
                  <Coins className="h-6 w-6 mt-2 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-between">
                  <div className="text-3xl font-bold">{(totalToken).toLocaleString("id-ID")}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">+{(totalTokenThisWeek).toLocaleString("id-ID")} since last week</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
              <DialogDescription>
                {getDialogDescription()}
              </DialogDescription>
            </DialogHeader>
            <div className="h-[400px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getChartData()}
                  margin={{ top: 5, right: 30, left: 60, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={getDataKey()}
                    tickFormatter={formatXAxis}
                    label={{
                      value: 'Time Period',
                      position: 'bottom',
                      offset: 10
                    }}
                  />
                  <YAxis
                    tickFormatter={formatYAxis}
                    label={{
                      value: getYAxisLabel(),
                      angle: -90,
                      position: 'insideLeft',
                      dx: -10,
                      style: {
                        textAnchor: 'middle',
                        paddingRight: '20px'
                      }
                    }}
                  />
                  <Tooltip formatter={formatTooltip} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}