import { Suspense } from "react";
import { prisma } from "@/config/db";
import { checkAccess, CheckCRUDPermission } from "@/utils/access-check";
import { MenuType } from "@prisma/client";
import { ContentLayout } from "@/components/dashboard/content-layout";
import { requireAuth } from "@/utils/auth-utils-server";
import { ClaudeSpinner } from "@/components/spinner";
import { Session } from "next-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading-skeletons/skeleton-base";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Calendar, BarChart3, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Import Client Components
import { QuickActions } from "@/components/dashboard/dashboard-simplified";

// Import TopAgentsServer (Server Component)
import { TopAgentsServer } from "@/components/dashboard/top-agents-server";

// Import session tracker
import { getActiveSessionsCount } from "@/utils/session-tracker";

// Import the client wrapper for refresh functionality
import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";

// Import theme utility
import { getThemeColors } from "@/utils/theme-colors";

// Enable streaming
export const dynamic = "force-dynamic";
export const revalidate = 0; // Real-time data

const year = new Date().getFullYear();

// Organization assignment helper
async function ensureUserHasOrganization(userId: string) {
  const existingUserOrganization = await prisma.userOnOrganization.findFirst({
    where: { userId },
  });

  if (!existingUserOrganization) {
    // Fallback to root organization
    const rootOrganization = await prisma.organization.findFirst({
      where: { isRoot: true },
    });

    if (rootOrganization) {
      await prisma.userOnOrganization.create({
        data: {
          userId,
          organizationId: rootOrganization.id,
        },
      });
    }
  }
}

// Utility function to calculate percentage change
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Helper function to get daily activity data
async function getDailyActivityData(userIds: string[]) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get daily chat counts for the last 30 days
  const dailyData: Array<{ date: string; conversations: number }> = [];

  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(thirtyDaysAgo);
    currentDate.setDate(thirtyDaysAgo.getDate() + i);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);

    const [chats, embeddedChats] = await Promise.all([
      prisma.chatNewVersion.count({
        where: {
          AND: [
            { userId: { in: userIds } },
            { createdAt: { gte: currentDate, lt: nextDate } },
          ],
        },
      }),
      prisma.embeddedChat.count({
        where: {
          AND: [
            { Agent: { userId: { in: userIds } } },
            { createdAt: { gte: currentDate, lt: nextDate } },
          ],
        },
      }),
    ]);

    dailyData.push({
      date: currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      conversations: chats + embeddedChats,
    });
  }

  return dailyData;
}

// Helper function to get monthly growth data
async function getMonthlyGrowthData(
  userIds: string[],
  organizationIds: string[]
) {
  const monthlyData: Array<{ month: string; users: number; agents: number }> =
    [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    const startOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const [users, agents] = await Promise.all([
      prisma.user.count({
        where: {
          AND: [
            {
              organization: {
                some: { organizationId: { in: organizationIds } },
              },
            },
            { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
      }),
      prisma.agent.count({
        where: {
          AND: [
            { userId: { in: userIds } },
            { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
      }),
    ]);

    monthlyData.push({
      month: monthDate.toLocaleDateString("en-US", { month: "short" }),
      users,
      agents,
    });
  }

  return monthlyData;
}

// Welcome Header Component (Always shown) - Indonesian time, English text
function WelcomeHeader() {
  // Get theme colors
  const themeColors = getThemeColors();

  // Get current time in Indonesian timezone (WIB - UTC+7)
  const currentDate = new Date();
  const indonesianDate = new Date(
    currentDate.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );

  const timeOfDay =
    indonesianDate.getHours() < 12
      ? "morning"
      : indonesianDate.getHours() < 18
        ? "afternoon"
        : "evening";

  // Format date in English but with Indonesian timezone
  const formattedDate = indonesianDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  });

  // Format time for Indonesia
  const formattedTime = indonesianDate.toLocaleTimeString("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className={`bg-gradient-to-br from-white via-${themeColors.primary}-50/30 to-${themeColors.primary === 'green' ? 'emerald' : 'indigo'}-50/50 dark:from-gray-900 dark:via-${themeColors.primary}-950/30 dark:to-${themeColors.primary === 'green' ? 'emerald' : 'indigo'}-950/50 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`p-4 bg-gradient-to-br ${themeColors.primaryGradientFrom} ${themeColors.primaryGradientTo} rounded-3xl shadow-lg`}>
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
            </div>
            <div>
              <h1 className={`text-4xl font-bold bg-gradient-to-r from-gray-800 via-${themeColors.primaryMedium} to-${themeColors.primaryDark} dark:from-gray-100 dark:via-${themeColors.primaryLight} dark:to-white bg-clip-text text-transparent`}>
                Good {timeOfDay}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {formattedDate} • {formattedTime} WIB
              </p>
            </div>
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
            Welcome to your AI assistant hub. Access your agents, manage
            conversations, and explore available tools.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                System Online
              </span>
            </div>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
            >
              <Activity className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Metrics - Server Component with conditional rendering based on access
async function DashboardMetrics(session: Session) {
  const MENU_CONST = MenuType.DASHBOARD;
  const hasAccess = checkAccess(session, MENU_CONST);
  const canView = CheckCRUDPermission(session, MENU_CONST, "read");
  const themeColors = getThemeColors();

  // Get organization and user IDs (needed for both access levels)
  const userOrganizations = await prisma.userOnOrganization.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const organizationIds = userOrganizations.map((org) => org.organizationId);

  const usersInOrgs = await prisma.userOnOrganization.findMany({
    where: { organizationId: { in: organizationIds } },
    select: { userId: true },
  });
  const userIds = usersInOrgs.map((u) => u.userId);

  // If user doesn't have dashboard access, show limited view
  if (!hasAccess || !canView) {
    return (
      <div className="space-y-8">
        {/* Welcome Header - Always shown */}
        <WelcomeHeader />

        {/* Access Level Notice */}
        <Card className={`bg-${themeColors.primary}-50 dark:bg-${themeColors.primary}-950/30 border border-${themeColors.primary}-200 dark:border-${themeColors.primary}-800/50`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${themeColors.primary}-100 dark:bg-${themeColors.primary}-900/50 rounded-lg`}>
                <BarChart3 className={`h-5 w-5 ${themeColors.textPrimary} dark:text-${themeColors.primary}-400`} />
              </div>
              <div>
                <h3 className={`font-medium text-${themeColors.primary}-900 dark:text-${themeColors.primary}-100`}>
                  Welcome to your AI Hub
                </h3>
                <p className={`text-sm text-${themeColors.primary}-700 dark:text-${themeColors.primary}-300`}>
                  You can access your agents and quick actions. Contact your administrator for full dashboard metrics access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout for Top Agents and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Agents - Always accessible */}
          <Suspense fallback={<TopAgentsSkeleton />}>
            <TopAgentsServer userId={session.user.id} organizationIds={organizationIds} />
          </Suspense>

          {/* Quick Actions - Always accessible */}
          <QuickActions />
        </div>
      </div>
    );
  }

  // Full dashboard access - show all metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );

  const startOfWeek = new Date(now);
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  startOfWeek.setDate(now.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfWeek);
  endOfLastWeek.setDate(startOfWeek.getDate() - 1);
  endOfLastWeek.setHours(23, 59, 59, 999);

  // Execute all database queries in parallel
  const [
    // Current period data
    totalAgents,
    totalUsers,
    totalChats,
    totalEmbeddedChats,

    // This month data
    agentsThisMonth,
    usersThisMonth,
    chatsThisMonth,
    embeddedChatsThisMonth,

    // Last month data for comparison
    agentsLastMonth,
    usersLastMonth,
    chatsLastMonth,
    embeddedChatsLastMonth,

    // Response time data
    avgResponseTimeThisWeek,
    avgResponseTimeLastWeek,

    // Active sessions from our session tracker
    activeSessions,

    // Chart data
    dailyActivity,
    monthlyGrowth,
  ] = await Promise.all([
    // Current totals
    prisma.agent.count({
      where: { userId: { in: userIds } },
    }),

    prisma.user.count({
      where: {
        organization: {
          some: { organizationId: { in: organizationIds } },
        },
      },
    }),

    prisma.chatNewVersion.count({
      where: { userId: { in: userIds } },
    }),

    prisma.embeddedChat.count({
      where: {
        Agent: { userId: { in: userIds } },
      },
    }),

    // This month counts
    prisma.agent.count({
      where: {
        AND: [
          { userId: { in: userIds } },
          { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    }),

    prisma.user.count({
      where: {
        AND: [
          {
            organization: {
              some: { organizationId: { in: organizationIds } },
            },
          },
          { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    }),

    prisma.chatNewVersion.count({
      where: {
        AND: [
          { userId: { in: userIds } },
          { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    }),

    prisma.embeddedChat.count({
      where: {
        AND: [
          { Agent: { userId: { in: userIds } } },
          { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    }),

    // Last month counts for comparison
    prisma.agent.count({
      where: {
        AND: [
          { userId: { in: userIds } },
          { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        ],
      },
    }),

    prisma.user.count({
      where: {
        AND: [
          {
            organization: {
              some: { organizationId: { in: organizationIds } },
            },
          },
          { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        ],
      },
    }),

    prisma.chatNewVersion.count({
      where: {
        AND: [
          { userId: { in: userIds } },
          { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        ],
      },
    }),

    prisma.embeddedChat.count({
      where: {
        AND: [
          { Agent: { userId: { in: userIds } } },
          { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        ],
      },
    }),

    // Response time calculations
    prisma.chatNewVersion.aggregate({
      where: {
        AND: [
          { userId: { in: userIds } },
          { createdAt: { gte: startOfWeek } },
          { totalResponseTime: { not: null } },
        ],
      },
      _avg: { totalResponseTime: true },
      _count: { id: true },
    }),

    prisma.chatNewVersion.aggregate({
      where: {
        AND: [
          { userId: { in: userIds } },
          { createdAt: { gte: startOfLastWeek, lte: endOfLastWeek } },
          { totalResponseTime: { not: null } },
        ],
      },
      _avg: { totalResponseTime: true },
      _count: { id: true },
    }),

    // Active sessions using our session tracker
    getActiveSessionsCount(organizationIds),

    // Chart data using helper functions
    getDailyActivityData(userIds),
    getMonthlyGrowthData(userIds, organizationIds),
  ]);

  // Calculate metrics
  const totalConversations = totalChats + totalEmbeddedChats;
  const conversationsThisMonth = chatsThisMonth + embeddedChatsThisMonth;
  const conversationsLastMonth = chatsLastMonth + embeddedChatsLastMonth;

  // Calculate response times in seconds
  const avgResponseTimeSeconds = avgResponseTimeThisWeek._avg.totalResponseTime
    ? avgResponseTimeThisWeek._avg.totalResponseTime / 1000
    : 0;
  const avgResponseTimeLastWeekSeconds = avgResponseTimeLastWeek._avg
    .totalResponseTime
    ? avgResponseTimeLastWeek._avg.totalResponseTime / 1000
    : 0;

  const responseTimeChange = calculatePercentageChange(
    avgResponseTimeSeconds,
    avgResponseTimeLastWeekSeconds
  );

  // Calculate month-over-month changes
  const agentsChange = calculatePercentageChange(
    agentsThisMonth,
    agentsLastMonth
  );
  const usersChange = calculatePercentageChange(usersThisMonth, usersLastMonth);
  const conversationsChange = calculatePercentageChange(
    conversationsThisMonth,
    conversationsLastMonth
  );

  // Calculate insights
  const performanceScore = Math.min(
    95,
    Math.max(
      60,
      100 - avgResponseTimeSeconds * 10 // Lower response time = higher score
    )
  );

  // Calculate a more realistic user satisfaction based on actual metrics
  const baseRating = 4.0;
  const performanceBonus = (performanceScore - 80) * 0.01; // Performance boost
  const activityBonus = Math.min(0.5, conversationsThisMonth / 1000); // Activity boost
  const avgRating = Math.min(
    5.0,
    Math.max(1.0, baseRating + performanceBonus + activityBonus)
  );

  // Use real active sessions count
  const activeSessionsCount = activeSessions;

  // Prepare data objects
  const dashboardData = {
    totalAgents,
    totalUsers,
    totalConversations,
    agentsThisMonth,
    usersThisMonth,
    conversationsThisMonth,
    avgResponseTime: avgResponseTimeSeconds,
    responseTimeChange: -responseTimeChange, // Negative because lower is better
    agentsChange,
    usersChange,
    conversationsChange,
  };

  const chartData = {
    dailyActivity,
    monthlyGrowth,
  };

  const insightsData = {
    performanceScore: Math.round(performanceScore),
    avgRating: Number(avgRating.toFixed(1)),
    activeSessions: activeSessionsCount,
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Client Wrapper - handles refresh functionality */}
      <DashboardClientWrapper
        dashboardData={dashboardData}
        chartData={chartData}
        insightsData={insightsData}
      />

      {/* Two Column Layout for Top Agents and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Agents - Server Component */}
        <Suspense fallback={<TopAgentsSkeleton />}>
          <TopAgentsServer
            userId={session.user.id}
            organizationIds={organizationIds}
          />
        </Suspense>

        {/* Quick Actions - Client Component */}
        <QuickActions />
      </div>
    </div>
  );
}

// Top Agents Skeleton Component
function TopAgentsSkeleton() {
  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// Full Dashboard Loading Skeleton
function FullDashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome Header Skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/10 to-transparent animate-shimmer" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-3xl" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-6 w-96 max-w-full" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
          >
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 flex items-end gap-2">
                {[40, 70, 45, 90, 65, 80, 50, 85].map((h, j) => (
                  <Skeleton key={j} className="flex-1" style={{ height: `${h}%` }} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


// Enhanced Main Dashboard Page Component
export default async function DashboardPage() {
  const session = await requireAuth();

  await ensureUserHasOrganization(session.user.id);

  const themeColors = getThemeColors();

  return (
    <ContentLayout title="Dashboard">
      <TooltipProvider>
        <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-${themeColors.primary}-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-${themeColors.primary}-950/30`}>
          <div className="max-w-7xl mx-auto space-y-8 p-6">
            {/* Main Dashboard Content */}
            <Suspense fallback={<FullDashboardSkeleton />}>
              <DashboardMetrics {...session} />
            </Suspense>

            {/* Footer Section */}
            <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span>&copy; {year} PT. Metrodata Electronics</span>
                  <span>•</span>
                  <span>KnowgenAi</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                    Data updated in real-time
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </ContentLayout>
  );
}