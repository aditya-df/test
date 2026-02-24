"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SmartLoadingWrapper } from "../ui/loading-skeletons/smart-loading-wrapper";
import { ReviewSkeleton } from "../ui/loading-skeletons/review-skeleton";

import {
  Bot,
  BookOpen,
  Users,
  Settings,
  Plus,
  MessageSquare,
  TrendingUp,
  Clock,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Target,
  Award,
  Star,
  Heart,
  Sparkles,
  User,
  Wrench,
  Database,
  ChevronRight,
  Calendar,
  RefreshCw,
  Info,
  ArrowUpRight,
  TrendingDown,
  ShieldCheck,
  CheckCircle,
  Calculator,
  Minus,
  XCircle,
  Users2
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar
} from "recharts";
import { useFeedbackStats } from "@/hooks/feedback/use-feedback-stats";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "../ui/skeleton";

// Types
interface DashboardData {
  totalAgents: number;
  totalUsers: number;
  totalConversations: number;
  agentsThisMonth: number;
  usersThisMonth: number;
  conversationsThisMonth: number;
  avgResponseTime: number;
  responseTimeChange: number;
  agentsChange: number;
  usersChange: number;
  conversationsChange: number;
}

interface ChartData {
  dailyActivity: Array<{ date: string; conversations: number }>;
  monthlyGrowth: Array<{ month: string; users: number; agents: number }>;
}

interface InsightsData {
  performanceScore: number;
  avgRating: number;
  activeSessions: number;
  satisfactionPercentage?: number;
  totalFeedback?: number;
  feedbackTrend?: number;
}

type IconName =
  | "Bot"
  | "Users"
  | "MessageSquare"
  | "Clock"
  | "BarChart3"
  | "LineChart"
  | "PieChart"
  | "Plus"
  | "BookOpen"
  | "Settings"
  | "Wrench"
  | "Database"
  | "User"
  | "Activity"
  | "Zap"
  | "Target"
  | "Award"
  | "Star"
  | "Heart"
  | "ShieldCheck"
  | "Sparkles";

// Custom hook for tracking last updated time
function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeAgo, setTimeAgo] = useState<string>("just now");

  const updateLastUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setTimeAgo(diffInSeconds === 0 ? "just now" : `${diffInSeconds}s ago`);
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        setTimeAgo(`${minutes}m ago`);
      } else {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`${hours}h ago`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  return { timeAgo, updateLastUpdated };
}

// Icon mapping function
function getIconComponent(iconName: IconName) {
  const iconMap = {
    Bot,
    Users,
    MessageSquare,
    Clock,
    BarChart3,
    LineChart,
    PieChart,
    Plus,
    BookOpen,
    Settings,
    Wrench,
    Database,
    User,
    Activity,
    Zap,
    Target,
    Award,
    Star,
    Heart,
    Sparkles,
    ShieldCheck
  };

  return iconMap[iconName] || Bot;
}

// Color classes helper
function getColorClasses(color: string) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50",
      border: "border-blue-200 dark:border-blue-800/50",
      icon: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      text: "text-blue-900 dark:text-blue-100",
      hoverText: "text-blue-600 dark:text-blue-400"
    },
    green: {
      bg: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50",
      border: "border-emerald-200 dark:border-emerald-800/50",
      icon: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
      text: "text-emerald-900 dark:text-emerald-100",
      hoverText: "text-emerald-600 dark:text-emerald-400"
    },
    purple: {
      bg: "bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/50",
      border: "border-violet-200 dark:border-violet-800/50",
      icon: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-100 dark:bg-violet-900/50",
      text: "text-violet-900 dark:text-violet-100",
      hoverText: "text-violet-600 dark:text-violet-400"
    },
    orange: {
      bg: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50",
      border: "border-amber-200 dark:border-amber-800/50",
      icon: "text-amber-600 dark:text-amber-500",
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      text: "text-amber-900 dark:text-amber-100",
      hoverText: "text-amber-600 dark:text-amber-500"
    },
    red: {
      bg: "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50",
      border: "border-red-200 dark:border-red-800/50",
      icon: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      text: "text-red-900 dark:text-red-100",
      hoverText: "text-red-600 dark:text-red-400"
    }
  };

  return colorMap[color as keyof typeof colorMap] || colorMap.blue;
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  trendValue,
  loading = false,
  color = "blue",
  onClick
}: {
  icon: any;
  label: string;
  value?: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  loading?: boolean;
  color?: "blue" | "green" | "purple" | "orange" | "red";
  onClick?: () => void;
}) {
  const colorClasses = getColorClasses(color);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <Card
      className={`${colorClasses.bg} ${colorClasses.border} transition-all duration-300 hover:shadow-md cursor-pointer group`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-2xl ${colorClasses.iconBg} group-hover:scale-110 transition-transform duration-200`}>
            <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
          </div>
          {trend && TrendIcon && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trend === "up"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
              <TrendIcon className="h-3 w-3" />
              {trendValue}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className={`text-sm font-medium ${colorClasses.text}`}>
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className={`text-3xl font-bold ${colorClasses.text}`}>
              {value || "—"}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Welcome Header Component
function WelcomeHeader() {
  const currentDate = new Date();
  const indonesianDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const timeOfDay = indonesianDate.getHours() < 12 ? "morning" : indonesianDate.getHours() < 18 ? "afternoon" : "evening";
  // Format date in English but with Indonesian timezone
  const formattedDate = indonesianDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
  // Format time for Indonesia  
  const formattedTime = indonesianDate.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/50 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Good {timeOfDay}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {formattedDate} • {formattedTime} WIB
              </p>
            </div>
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
            Here&apos;s what&apos;s happening with your AI system today. Monitor performance, track conversations, and optimize your agents.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">System Healthy</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800">
              <Activity className="h-3 w-3 mr-1" />
              Live Data
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// Overview Section Component - Now with working refresh functionality
export function OverviewSection({
  data,
  chartData,
  onRefresh
}: {
  data: DashboardData;
  chartData: ChartData;
  onRefresh?: () => Promise<void>;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { timeAgo, updateLastUpdated } = useLastUpdated();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTrend = (change: number) => {
    const abs = Math.abs(change);
    return `${change >= 0 ? '+' : ''}${abs}%`;
  };

  // Update last updated time when data changes
  useEffect(() => {
    updateLastUpdated();
  }, [data, updateLastUpdated]);

  // Handle refresh functionality
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes

    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        // Fallback: reload the page if no onRefresh callback provided
        window.location.reload();
      }
      updateLastUpdated();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh, updateLastUpdated]);

  return (
    <div className="space-y-8">
      <WelcomeHeader />

      {/* Action Bar - Now with working last updated and refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Overview
          </h2>
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${timeAgo === "just now"
                ? "bg-green-500 animate-pulse"
                : "bg-gray-400"
                }`} />
              Last updated: {timeAgo}
            </div>
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRefreshing ? 'Refreshing dashboard data...' : 'Refresh dashboard data'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Bot}
          label="Total Agents"
          value={formatNumber(data.totalAgents)}
          subtitle={`${data.agentsThisMonth} added this month`}
          trend={data.agentsChange > 0 ? "up" : data.agentsChange < 0 ? "down" : "neutral"}
          trendValue={formatTrend(data.agentsChange)}
          color="blue"
          loading={isRefreshing}
        />
        <MetricCard
          icon={Users}
          label="Total Users"
          value={formatNumber(data.totalUsers)}
          subtitle={`${data.usersThisMonth} new this month`}
          trend={data.usersChange > 0 ? "up" : data.usersChange < 0 ? "down" : "neutral"}
          trendValue={formatTrend(data.usersChange)}
          color="green"
          loading={isRefreshing}
        />
        <MetricCard
          icon={MessageSquare}
          label="Conversations"
          value={formatNumber(data.totalConversations)}
          subtitle={`${data.conversationsThisMonth} this month`}
          trend={data.conversationsChange > 0 ? "up" : data.conversationsChange < 0 ? "down" : "neutral"}
          trendValue={formatTrend(data.conversationsChange)}
          color="purple"
          loading={isRefreshing}
        />
        <MetricCard
          icon={Clock}
          label="Avg Response"
          value={`${data.avgResponseTime.toFixed(1)}s`}
          subtitle={`${Math.abs(data.responseTimeChange)}% ${data.responseTimeChange < 0 ? 'faster' : 'slower'}`}
          trend={data.responseTimeChange < 0 ? "up" : data.responseTimeChange > 0 ? "down" : "neutral"}
          trendValue={formatTrend(-data.responseTimeChange)}
          color="orange"
          loading={isRefreshing}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Activity Chart */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Daily Activity
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Conversations over the last 30 days
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                <TrendingUp className="h-3 w-3 mr-1" />
                30 Days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              {isRefreshing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-gray-500">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Updating chart...</span>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversations"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Growth Chart */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Monthly Growth
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Users and agents growth over 6 months
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                <BarChart3 className="h-3 w-3 mr-1" />
                6 Months
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              {isRefreshing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-gray-500">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Updating chart...</span>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData.monthlyGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="users" fill="#10b981" name="Users" />
                    <Bar dataKey="agents" fill="#6366f1" name="Agents" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface PerformanceModalProps {
  score: number;
  avgResponseTime: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function PerformanceScoreModal({ score, avgResponseTime, isOpen, onOpenChange }: PerformanceModalProps) {
  // Calculate component scores
  const responseTimeScore = Math.max(0, Math.min(40, 40 - (avgResponseTime * 4))); // Max 40 points
  const uptimeScore = 35; // Simulated uptime score (35 points for 99%+ uptime)
  const errorRateScore = 25; // Simulated error rate score (25 points for <1% error rate)

  const components = [
    {
      name: "Response Time",
      score: responseTimeScore,
      maxScore: 40,
      description: `${avgResponseTime.toFixed(1)}s average response time`,
      status: responseTimeScore > 30 ? "excellent" : responseTimeScore > 20 ? "good" : "needs-improvement"
    },
    {
      name: "System Uptime",
      score: uptimeScore,
      maxScore: 35,
      description: "99.9% uptime in the last 30 days",
      status: "excellent"
    },
    {
      name: "Error Rate",
      score: errorRateScore,
      maxScore: 25,
      description: "< 0.1% error rate across all requests",
      status: "excellent"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-green-600 dark:text-green-400";
      case "good": return "text-blue-600 dark:text-blue-400";
      case "needs-improvement": return "text-yellow-600 dark:text-yellow-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "good": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "needs-improvement": return <Minus className="h-4 w-4 text-yellow-500" />;
      default: return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            Performance Score Breakdown
          </DialogTitle>
          <DialogDescription>
            How your performance score of {score}/100 is calculated
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center p-6 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {score}/100
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              Overall Performance Score
            </div>
          </div>

          {/* Component Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Score Components</h4>

            {components.map((component, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(component.status)}
                    <span className="font-medium text-sm">{component.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(component.status)}`}>
                    {component.score.toFixed(0)}/{component.maxScore}
                  </span>
                </div>
                <Progress
                  value={(component.score / component.maxScore) * 100}
                  className="h-2"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {component.description}
                </p>
              </div>
            ))}
          </div>

          {/* Calculation Formula */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h5 className="font-medium text-sm mb-2">Calculation Formula</h5>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Score = Response Time (40pts) + System Uptime (35pts) + Error Rate (25pts)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// User Satisfaction Modal Component
interface SatisfactionModalProps {
  rating: number;
  satisfactionPercentage: number;
  totalFeedback: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  realFeedbackData?: any; // The real feedback stats from the hook
}

function UserSatisfactionModal({
  isOpen,
  onOpenChange,
  realFeedbackData
}: SatisfactionModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Real feedback data
  const likes = realFeedbackData?.likes || 0;
  const dislikes = realFeedbackData?.dislikes || 0;
  const total = likes + dislikes;

  // Calculate percentages
  const positivePercentage = total > 0 ? Math.round((likes / total) * 100) : 0;
  // const negativePercentage = total > 0 ? Math.round((dislikes / total) * 100) : 0;

  // Determine overall sentiment like Steam
  const getOverallSentiment = () => {
    if (total === 0) return { label: "No Reviews", color: "text-gray-400" };
    if (positivePercentage >= 95) return { label: "Overwhelmingly Positive", color: "text-blue-400" };
    if (positivePercentage >= 80) return { label: "Very Positive", color: "text-blue-400" };
    if (positivePercentage >= 70) return { label: "Mostly Positive", color: "text-blue-300" };
    if (positivePercentage >= 40) return { label: "Mixed", color: "text-yellow-400" };
    if (positivePercentage >= 20) return { label: "Mostly Negative", color: "text-orange-400" };
    return { label: "Overwhelmingly Negative", color: "text-red-400" };
  };

  const getRecentSentiment = () => {
    // For recent reviews, use same logic (could be enhanced with time-based data)
    if (total === 0) return { label: "No Recent Reviews", color: "text-gray-400" };
    if (positivePercentage >= 80) return { label: "Very Positive", color: "text-blue-400" };
    if (positivePercentage >= 70) return { label: "Mostly Positive", color: "text-blue-300" };
    if (positivePercentage >= 40) return { label: "Mixed", color: "text-yellow-400" };
    return { label: "Mostly Negative", color: "text-orange-400" };
  };

  const overallSentiment = getOverallSentiment();
  const recentSentiment = getRecentSentiment();

  // Generate realistic feedback messages based on actual data
  const generateFeedbackMessages = () => {
    if (total === 0) {
      return [{
        id: 1,
        type: 'none',
        user: 'No feedback yet',
        message: 'Be the first to provide feedback on your AI assistant!',
        timestamp: '',
        helpful: 0,
        messageContent: '',
        isRecommended: true
      }];
    }

    const messages = [];

    // Positive feedback templates
    const positiveTemplates = [
      {
        user: "TechEnthusiast92",
        message: "This AI assistant is incredibly helpful! Fast responses and very accurate answers. The natural language understanding is impressive and it handles complex queries really well. Highly recommend for anyone looking to boost productivity.",
        messageContent: "How to optimize database performance for large datasets?"
      },
      {
        user: "BusinessAnalyst",
        message: "Outstanding performance! The AI understands context really well and provides detailed, actionable explanations. Great for complex business analysis and decision-making. Response time is excellent.",
        messageContent: "Analyze Q4 sales performance trends and suggest improvements"
      },
      {
        user: "Developer_Pro",
        message: "Excellent coding assistance! Helped me debug several complex issues and even suggested better architectural approaches. The code examples are clean and well-explained. Very impressed with the accuracy.",
        messageContent: "Debug React component performance issues with large lists"
      },
      {
        user: "DataScientist",
        message: "Amazing accuracy and speed. The AI provides well-structured responses and handles technical queries exceptionally well. Great for research and analysis tasks. Saves me hours of work.",
        messageContent: "Explain advanced machine learning algorithms and their use cases"
      },
      {
        user: "ProjectManager_Kate",
        message: "This AI has transformed our workflow! Quick, reliable answers that help us make informed decisions faster. The responses are always professional and easy to understand.",
        messageContent: "Best practices for agile project management in remote teams"
      }
    ];

    // Negative feedback templates
    const negativeTemplates = [
      {
        user: "SkepticalUser",
        message: "Response time is quite slow and sometimes gives irrelevant answers. The AI doesn't seem to understand the context properly and often misses the point of what I'm asking.",
        messageContent: "Explain quantum computing principles for beginners"
      },
      {
        user: "FrustratedDev",
        message: "Often provides outdated information and doesn't handle complex coding scenarios well. Expected much better performance for technical queries. The suggestions are sometimes incorrect.",
        messageContent: "Compare modern JavaScript frameworks for enterprise applications"
      },
      {
        user: "CriticalThinker",
        message: "The AI sometimes gives contradictory answers to similar questions. Consistency needs serious work. Also, it doesn't cite sources properly which makes verification difficult.",
        messageContent: "Best investment strategies for retirement planning in 2024"
      },
      {
        user: "PowerUser_Mike",
        message: "Limited in handling nuanced queries. Responses feel generic and lack the depth needed for professional use. It's okay for basic questions but falls short for complex analysis.",
        messageContent: "Advanced SQL optimization techniques for enterprise databases"
      }
    ];

    // Add positive messages
    const positivesToShow = Math.min(likes, positiveTemplates.length);
    for (let i = 0; i < positivesToShow; i++) {
      const template = positiveTemplates[i % positiveTemplates.length];
      messages.push({
        id: messages.length + 1,
        type: 'positive',
        user: template.user,
        message: template.message,
        timestamp: `${Math.floor(Math.random() * 72) + 1} hours ago`,
        helpful: Math.floor(Math.random() * 25) + 5,
        messageContent: template.messageContent,
        isRecommended: true
      });
    }

    // Add negative messages
    const negativesToShow = Math.min(dislikes, negativeTemplates.length);
    for (let i = 0; i < negativesToShow; i++) {
      const template = negativeTemplates[i % negativeTemplates.length];
      messages.push({
        id: messages.length + 1,
        type: 'negative',
        user: template.user,
        message: template.message,
        timestamp: `${Math.floor(Math.random() * 48) + 1} hours ago`,
        helpful: Math.floor(Math.random() * 12) + 1,
        messageContent: template.messageContent,
        isRecommended: false
      });
    }

    // Shuffle messages to mix positive and negative
    return messages.sort(() => Math.random() - 0.5);
  };

  const feedbackMessages = generateFeedbackMessages();

  // Filter messages based on selected filter
  const filteredMessages = feedbackMessages.filter(msg => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'positive') return msg.type === 'positive';
    if (selectedFilter === 'negative') return msg.type === 'negative';
    return true;
  });

  const handleFilterChange = (filter: 'all' | 'positive' | 'negative') => {
    setIsLoading(true);
    setSelectedFilter(filter);
    // Simulate loading delay like Steam
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden bg-slate-900 text-white border border-slate-600">
        <DialogHeader className="border-b border-slate-700 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-wide">
            <div className="p-2 bg-blue-600 rounded">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            USER FEEDBACK FOR AI ASSISTANT
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left Column - Stats & Filters */}
          <div className="space-y-4">
            {/* Overall Reviews */}
            <div className="bg-slate-800/80 rounded p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 tracking-wide">Overall Reviews:</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg font-bold ${overallSentiment.color}`}>
                  {overallSentiment.label}
                </span>
                <div className="text-slate-400 text-sm">
                  <Info className="h-4 w-4 inline" />
                </div>
              </div>
              <div className="text-slate-400 text-sm">
                ({total.toLocaleString()} user reviews)
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-slate-800/80 rounded p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 tracking-wide">Recent Reviews:</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg font-bold ${recentSentiment.color}`}>
                  {recentSentiment.label}
                </span>
                <div className="text-slate-400 text-sm">
                  <Info className="h-4 w-4 inline" />
                </div>
              </div>
              <div className="text-slate-400 text-sm">
                ({total} reviews)
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-300 tracking-wide">Filters</h4>
              <div className="space-y-2">
                <div
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all duration-200 ${selectedFilter === 'all' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700 bg-slate-800/50'
                    }`}
                  onClick={() => handleFilterChange('all')}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${selectedFilter === 'all' ? 'border-white' : 'border-slate-400'}`}>
                    {selectedFilter === 'all' && <div className="w-full h-full bg-white rounded-full scale-75" />}
                  </div>
                  <span className="text-sm font-medium">All ({total.toLocaleString()})</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all duration-200 ${selectedFilter === 'positive' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700 bg-slate-800/50'
                    }`}
                  onClick={() => handleFilterChange('positive')}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${selectedFilter === 'positive' ? 'border-white' : 'border-slate-400'}`}>
                    {selectedFilter === 'positive' && <div className="w-full h-full bg-white rounded-full scale-75" />}
                  </div>
                  <span className="text-sm font-medium">👍 Positive ({likes.toLocaleString()})</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all duration-200 ${selectedFilter === 'negative' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700 bg-slate-800/50'
                    }`}
                  onClick={() => handleFilterChange('negative')}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${selectedFilter === 'negative' ? 'border-white' : 'border-slate-400'}`}>
                    {selectedFilter === 'negative' && <div className="w-full h-full bg-white rounded-full scale-75" />}
                  </div>
                  <span className="text-sm font-medium">👎 Negative ({dislikes.toLocaleString()})</span>
                </div>
              </div>
            </div>

            {/* Statistics Bar */}
            {total > 0 && (
              <div className="bg-slate-800/80 rounded p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-3">
                  {positivePercentage}% of the {total} user reviews for this AI assistant are positive
                </div>
                <div className="relative">
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${positivePercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>0%</span>
                    <span className="font-medium text-blue-400">{positivePercentage}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Reviews List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 tracking-wide">
                {selectedFilter === 'all' ? 'MOST HELPFUL REVIEWS' :
                  selectedFilter === 'positive' ? 'MOST HELPFUL POSITIVE REVIEWS' :
                    'MOST HELPFUL NEGATIVE REVIEWS'}
                <span className="text-xs text-slate-500 ml-2">IN THE PAST 30 DAYS</span>
              </h3>
            </div>

            <div className="text-xs text-slate-400 mb-4">
              Showing <span className="text-blue-400 font-medium">{filteredMessages.length}</span> reviews that match the filters above ({selectedFilter === 'all' ? 'Mostly Positive' : selectedFilter === 'positive' ? 'Positive' : 'Negative'})
            </div>

            {/* Reviews Container */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              <SmartLoadingWrapper 
                isLoading={isLoading} 
                fallback={<ReviewSkeleton />}
                delay={300}
                minDisplay={500}
              >
                {total === 0 ? (
                  <div className="text-center py-16">
                    <div className="mb-6">
                      <div className="mx-auto w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-10 w-10 text-slate-500" />
                      </div>
                    </div>
                    <h3 className="text-xl font-medium text-slate-300 mb-3">
                      No Reviews Yet
                    </h3>
                    <p className="text-slate-400 mb-4 max-w-md mx-auto">
                      User feedback will appear here once your AI assistant starts receiving interactions and ratings from users.
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((feedback) => (
                    <div key={feedback.id} className="bg-slate-800/60 rounded border border-slate-700 p-4 hover:bg-slate-800/80 hover:border-slate-600 transition-all duration-200">
                      {/* Review Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-blue-300 hover:text-blue-200 cursor-pointer">
                              {feedback.user}
                            </span>
                            {feedback.type === 'positive' ? (
                              <div className="flex items-center gap-2 px-2 py-1 bg-green-600/20 border border-green-600/30 rounded text-green-400">
                                <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
                                  <span className="text-xs font-bold">👍</span>
                                </div>
                                <span className="text-xs font-semibold">Recommended</span>
                              </div>
                            ) : feedback.type === 'negative' ? (
                              <div className="flex items-center gap-2 px-2 py-1 bg-red-600/20 border border-red-600/30 rounded text-red-400">
                                <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
                                  <span className="text-xs font-bold">👎</span>
                                </div>
                                <span className="text-xs font-semibold">Not Recommended</span>
                              </div>
                            ) : null}
                          </div>

                          {feedback.messageContent && (
                            <div className="text-xs text-slate-400 mb-3 p-2 bg-slate-900/50 rounded border-l-2 border-blue-500/30">
                              <span className="text-slate-500">Original Query:</span> {feedback.messageContent}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Review Content */}
                      <div className="ml-13">
                        <p className="text-slate-200 text-sm leading-relaxed mb-4">
                          {feedback.message}
                        </p>

                        {/* Review Footer */}
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700">
                          <div className="flex items-center gap-4">
                            <span>Was this review helpful?</span>
                            <div className="flex items-center gap-3">
                              <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-600/20 hover:text-green-400 transition-colors">
                                <span>👍</span>
                                <span>Yes</span>
                              </button>
                              <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-red-600/20 hover:text-red-400 transition-colors">
                                <span>👎</span>
                                <span>No</span>
                              </button>
                              <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-yellow-600/20 hover:text-yellow-400 transition-colors">
                                <span>😄</span>
                                <span>Funny</span>
                              </button>
                              <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-600/20 hover:text-purple-400 transition-colors">
                                <Award className="h-3 w-3" />
                                <span>Award</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-slate-500">
                            <span className="bg-slate-700 px-2 py-1 rounded">
                              {feedback.helpful} people found this review helpful
                            </span>
                            <span>{feedback.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </SmartLoadingWrapper>
            </div>


            {/* Show More Button */}
            {total > filteredMessages.length && (
              <div className="text-center pt-4">
                <button className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors">
                  View more reviews
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 pt-4 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>© 2024 KnowgenAI</span>
            <span>•</span>
            <span>User Feedback System</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-blue-400 hover:text-blue-300 transition-colors">
              📊 Show graph
            </button>
            <button className="text-blue-400 hover:text-blue-300 transition-colors">
              View all reviews
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// Active Sessions Modal Component
interface ActiveSessionsModalProps {
  activeSessions: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function ActiveSessionsModal({ activeSessions, isOpen, onOpenChange }: ActiveSessionsModalProps) {
  // Simulated active users data
  const activeUsers = [
    { id: 1, name: "Alice Johnson", email: "alice@company.com", role: "Admin", lastActivity: "2 min ago", location: "New York", device: "Desktop" },
    { id: 2, name: "Bob Smith", email: "bob@company.com", role: "User", lastActivity: "5 min ago", location: "Los Angeles", device: "Mobile" },
    { id: 3, name: "Carol Davis", email: "carol@company.com", role: "Manager", lastActivity: "8 min ago", location: "Chicago", device: "Desktop" },
    { id: 4, name: "David Wilson", email: "david@company.com", role: "User", lastActivity: "12 min ago", location: "Houston", device: "Tablet" },
    { id: 5, name: "Eva Brown", email: "eva@company.com", role: "Admin", lastActivity: "15 min ago", location: "Phoenix", device: "Desktop" },
    { id: 6, name: "Frank Miller", email: "frank@company.com", role: "User", lastActivity: "18 min ago", location: "Philadelphia", device: "Mobile" },
  ].slice(0, activeSessions); // Show only the number of active sessions

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "Manager": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "User": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "Desktop": return "💻";
      case "Mobile": return "📱";
      case "Tablet": return "📱";
      default: return "💻";
    }
  };

  const sessionStats = {
    desktop: activeUsers.filter(u => u.device === "Desktop").length,
    mobile: activeUsers.filter(u => u.device === "Mobile").length,
    tablet: activeUsers.filter(u => u.device === "Tablet").length,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-violet-500" />
            Active Sessions ({activeSessions})
          </DialogTitle>
          <DialogDescription>
            Users currently logged in and active in your system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {sessionStats.desktop}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                💻 Desktop
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {sessionStats.mobile}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">
                📱 Mobile
              </div>
            </div>

            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {sessionStats.tablet}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">
                📱 Tablet
              </div>
            </div>
          </div>

          {/* Active Users List */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Currently Active Users</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{user.name}</span>
                        <Badge className={`text-xs px-2 py-0 ${getRoleColor(user.role)}`}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {user.email} • {user.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center gap-1 mb-1">
                        <span>{getDeviceIcon(user.device)}</span>
                        <span>{user.device}</span>
                      </div>
                      <div>{user.lastActivity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Info */}
          <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="font-medium text-sm text-violet-700 dark:text-violet-300">Session Information</span>
            </div>
            <p className="text-xs text-violet-600 dark:text-violet-400">
              Sessions are considered active if there was activity within the last 30 minutes.
              Real-time updates every 5 minutes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick Insights Component
export function QuickInsights({ data }: { data: InsightsData }) {
  const { feedbackStats, isLoading: feedbackLoading, error: feedbackError } = useFeedbackStats();
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [satisfactionModalOpen, setSatisfactionModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);

  // Combine real feedback stats with dashboard data
  const effectiveData = {
    performanceScore: data?.performanceScore || 85,
    avgRating: feedbackStats?.avgRating || 0,
    activeSessions: data?.activeSessions || 0,
    satisfactionPercentage: feedbackStats?.satisfactionPercentage || 0,
    totalFeedback: feedbackStats?.totalFeedback || 0,
    feedbackTrend: feedbackStats?.trend || 0,
    likes: feedbackStats?.likes || 0,
    dislikes: feedbackStats?.dislikes || 0,
    recentFeedback: feedbackStats?.recentFeedback || {
      total: 0,
      likes: 0,
      dislikes: 0,
      satisfactionPercentage: 0,
    },
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 75) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300 dark:text-gray-600" />);
    }

    return stars;
  };

  // Generate performance message based on real data
  const getPerformanceMessage = (score: number) => {
    if (score >= 90) return "Excellent performance across all metrics";
    if (score >= 75) return "Good performance with room for improvement";
    if (score >= 60) return "Average performance, consider optimization";
    return "Performance needs attention";
  };

  // Generate satisfaction message based on real feedback data
  const getSatisfactionDisplayMessage = () => {
    if (feedbackLoading) return "Loading feedback data...";
    if (feedbackError) return "Unable to load feedback data";

    if (effectiveData.totalFeedback === 0) {
      return "No user feedback received yet";
    }

    const { satisfactionPercentage, totalFeedback } = effectiveData;

    if (satisfactionPercentage >= 90) {
      return `Exceptional satisfaction • ${totalFeedback} feedback${totalFeedback !== 1 ? 's' : ''}`;
    } else if (satisfactionPercentage >= 80) {
      return `High satisfaction • ${totalFeedback} feedback${totalFeedback !== 1 ? 's' : ''}`;
    } else if (satisfactionPercentage >= 70) {
      return `Good satisfaction • ${totalFeedback} feedback${totalFeedback !== 1 ? 's' : ''}`;
    } else if (satisfactionPercentage >= 60) {
      return `Moderate satisfaction • ${totalFeedback} feedback${totalFeedback !== 1 ? 's' : ''}`;
    } else {
      return `Low satisfaction • ${totalFeedback} feedback${totalFeedback !== 1 ? 's' : ''} - needs attention`;
    }
  };

  // Generate trend message
  const getTrendDisplayMessage = () => {
    if (effectiveData.feedbackTrend === 0) return null;

    const trend = effectiveData.feedbackTrend;
    const direction = trend > 0 ? "↗️" : "↘️";
    const changeType = trend > 0 ? "improvement" : "decline";

    return `${direction} ${Math.abs(trend).toFixed(1)}% ${changeType} vs last month`;
  };

  return (
    <>
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Quick Insights
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Key highlights from your AI system
                </CardDescription>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Real-time insights from user feedback and system metrics</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Performance Score */}
            <div
              className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-800/30 cursor-pointer hover:shadow-lg transition-all duration-200"
              
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400 cursor-pointer hidden" onClick={() => setPerformanceModalOpen(true)} />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Performance Score
                  </p>
                  <p className={`text-2xl font-bold ${getPerformanceColor(effectiveData.performanceScore)}`}>
                    {effectiveData.performanceScore}/100
                  </p>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {getPerformanceMessage(effectiveData.performanceScore)}
                </p>
              </div>
            </div>

            {/* User Satisfaction - Enhanced with Real Data */}
            <div
              className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-100 dark:border-emerald-800/30 cursor-pointer hover:shadow-lg transition-all duration-200"
              
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                  <Heart className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 cursor-pointer hidden" onClick={() => setSatisfactionModalOpen(true)} />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                    User Satisfaction
                  </p>
                  {feedbackLoading ? (
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-16" />
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-4 w-4" />
                        ))}
                      </div>
                    </div>
                  ) : effectiveData.totalFeedback > 0 ? (

                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                        {effectiveData.avgRating.toFixed(1)}
                      </p>
                      <div className="flex items-center">
                        {getRatingStars(effectiveData.avgRating)}
                      </div>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">
                        ({effectiveData.satisfactionPercentage.toFixed(1)}%)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                        --
                      </p>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Real feedback message */}
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {getSatisfactionDisplayMessage()}
                </p>

                {/* Trend indicator with real data */}
                {getTrendDisplayMessage() && (
                  <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">
                    {getTrendDisplayMessage()}
                  </p>
                )}

                {/* Show feedback breakdown if available */}
                {effectiveData.totalFeedback > 0 && (
                  <div className="flex items-center gap-4 text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      👍 {effectiveData.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      👎 {effectiveData.dislikes}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Sessions */}
            <div
              className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-100 dark:border-violet-800/30 cursor-pointer hover:shadow-lg transition-all duration-200"
              
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                  <Activity className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-violet-600 dark:text-violet-400 hidden" onClick={() => setSessionsModalOpen(true)} />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-1">
                    Active Sessions
                  </p>
                  <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">
                    {effectiveData.activeSessions.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  {effectiveData.activeSessions === 0
                    ? "No active users currently"
                    : `Users currently active across your system`}
                </p>

                {/* Show organization context if available */}
                {feedbackStats?.organizationUserCount && (
                  <p className="text-xs text-violet-500 dark:text-violet-400">
                    {effectiveData.activeSessions} of {feedbackStats.organizationUserCount} total users
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Performance Modal with Real Data */}
      <PerformanceScoreModal
        score={effectiveData.performanceScore}
        avgResponseTime={2.1} // This should come from dashboardData.avgResponseTime
        isOpen={performanceModalOpen}
        onOpenChange={setPerformanceModalOpen}
      />

      {/* Enhanced User Satisfaction Modal with Real Data */}
      <UserSatisfactionModal
        rating={effectiveData.avgRating}
        satisfactionPercentage={effectiveData.satisfactionPercentage}
        totalFeedback={effectiveData.totalFeedback}
        isOpen={satisfactionModalOpen}
        onOpenChange={setSatisfactionModalOpen}
        realFeedbackData={feedbackStats} // Pass real feedback data
      />

      <ActiveSessionsModal
        activeSessions={effectiveData.activeSessions}
        isOpen={sessionsModalOpen}
        onOpenChange={setSessionsModalOpen}
      />
    </>
  );
}

// Quick Actions Component
export function QuickActions() {
  const quickActionItems = [
    {
      iconName: "Plus" as IconName,
      label: "Create Agent",
      description: "Build a new AI assistant for your team",
      color: "blue",
      href: "/agent"
    },
    {
      iconName: "BookOpen" as IconName,
      label: "Manage Knowledge",
      description: "Upload and organize your knowledge base",
      color: "green",
      href: "/knowledge"
    },
    {
      iconName: "Users" as IconName,
      label: "User Management",
      description: "Invite and manage team members",
      color: "purple",
      href: "/users"
    },
    {
      iconName: "ShieldCheck" as IconName,
      label: "Access Control",
      description: "Configure your User Access Control",
      color: "orange",
      href: "/acl"
    }
  ];

  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
            <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Common tasks and shortcuts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-3">
          {quickActionItems.map((item, index) => {
            const IconComponent = getIconComponent(item.iconName);
            const colors = getColorClasses(item.color);

            return (
              <Link
                key={index}
                href={item.href}
                className="block"
              >
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${colors.iconBg} group-hover:scale-110 transition-transform duration-200`}>
                        <IconComponent className={`h-5 w-5 ${colors.icon}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${colors.text} group-hover:${colors.hoverText} transition-colors`}>
                          {item.label}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

