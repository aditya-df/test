"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  OverviewSection, 
  QuickInsights
} from "@/components/dashboard/dashboard-simplified";

// Types for props
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
}

interface DashboardClientWrapperProps {
  dashboardData: DashboardData;
  chartData: ChartData;
  insightsData: InsightsData;
}

export function DashboardClientWrapper({
  dashboardData,
  chartData,
  insightsData
}: DashboardClientWrapperProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle refresh functionality using Next.js router.refresh()
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes
    
    setIsRefreshing(true);
    
    try {
      // Use Next.js router.refresh() to trigger server component re-rendering
      // This will re-fetch all server component data
      router.refresh();
      
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      
      // Fallback: reload the page if router.refresh fails
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  }, [router, isRefreshing]);

  return (
    <div className="space-y-8">
      {/* Overview Section with Charts - Now with refresh capability */}
      <OverviewSection 
        data={dashboardData} 
        chartData={chartData}
        onRefresh={handleRefresh}
      />
      
      {/* Quick Insights Section - Now with average response time */}
      <QuickInsights 
        data={insightsData} 
      />
    </div>
  );
}