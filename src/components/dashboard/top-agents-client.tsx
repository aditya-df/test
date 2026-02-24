"use client";

import React from "react";
import Link from "next/link";
import {
  MessageSquare,
  TrendingUp,
  ChevronRight,
  Bot,
  Users,
  Activity
} from "lucide-react";
import { getAgentIcon } from "@/utils/utils";
import { AvatarPreview } from "@/components/dashboard/agent/agent-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/utils";

interface Agent {
  id: string;
  agentName: string;
  description: string;
  totalConversations: number;
  icon: string;
  image?: string | null; // Add this line
  href: string;
}

interface TopAgentsListProps {
  agents: Agent[];
}

// Create a custom AgentAvatar component for the list
const AgentAvatarIcon = ({ agentImage, agentName, className }: {
  agentImage?: string | null;
  agentName: string;
  className?: string;
}) => {
  if (agentImage) {
    // Use the custom avatar with gradient - smaller size for list
    return (
      <div className={className}>
        <AvatarPreview avatarId={agentImage} size="sm" />
      </div>
    );
  }

  // Fallback to icon-based avatar
  const IconComponent = getAgentIcon(agentName);
  return (
    <div className={cn(
      "flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50",
      className
    )}>
      <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    </div>
  );
};

export function TopAgentsList({ agents }: TopAgentsListProps) {
  if (!agents || agents.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Top Agents
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Most active AI assistants
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
              <Bot className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No agents available or no conversations yet
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/agent">
                Create Your First Agent
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Top Agents
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Most active AI assistants
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Activity className="h-3 w-3 mr-1" />
            {agents.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {agents.map((agent, index) => {
            return (
              <Link
                key={agent.id}
                href={agent.href}
                className="block hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
              >
                {/* Desktop Layout */}
                <div className="hidden sm:flex p-4 items-center justify-between group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Rank Badge */}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                      index === 0 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                      index === 1 && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
                      index === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                      index > 2 && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {index + 1}
                    </div>

                    {/* Agent Avatar */}
                    <AgentAvatarIcon
                      agentImage={agent.image}
                      agentName={agent.agentName}
                      className="group-hover:scale-110 transition-transform duration-200"
                    />

                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {agent.agentName}
                        </h3>
                        {index === 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                            Top
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {agent.description}
                      </p>
                    </div>
                  </div>

                  {/* Stats and Arrow */}
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <MessageSquare className="h-3 w-3" />
                        {agent.totalConversations.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        conversations
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>

                {/* Mobile Layout - Stacked for better readability */}
                <div className="sm:hidden p-4 group">
                  <div className="flex items-start gap-3">
                    {/* Rank Badge - Smaller on mobile */}
                    <div className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-1 flex-shrink-0",
                      index === 0 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                      index === 1 && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
                      index === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                      index > 2 && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {index + 1}
                    </div>

                    {/* Agent Avatar - Smaller on mobile */}
                    <div className="flex-shrink-0 mt-1">
                      <AgentAvatarIcon
                        agentImage={agent.image}
                        agentName={agent.agentName}
                        className="w-8 h-8"
                      />
                    </div>

                    {/* Agent Info - Full width for better text display */}
                    <div className="flex-1 min-w-0">
                      {/* Agent Name and Top Badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm leading-tight">
                          {agent.agentName}
                        </h3>
                        {index === 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                            Top
                          </Badge>
                        )}
                      </div>

                      {/* Description - Truncated but more space */}
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {agent.description}
                      </p>

                      {/* Stats - Moved below for better mobile layout */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                          <MessageSquare className="h-3 w-3" />
                          <span className="font-medium">{agent.totalConversations.toLocaleString()}</span>
                          <span className="text-gray-500 dark:text-gray-400">conversations</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer with View All link */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <Button variant="ghost" className="w-full justify-center gap-2" asChild>
            <Link href="/agent">
              <Users className="h-4 w-4" />
              View All Agents
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}