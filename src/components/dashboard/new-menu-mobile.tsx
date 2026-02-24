"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import {
  MessageSquare,
  ChevronDown,
  Users,
  UserPlus,
  ShieldCheck,
  Key,
  Trash2,
  Settings,
  Cpu,
  Wrench,
  Search,
  LayoutList,
  Building,
  ScrollText,
} from "lucide-react";
import { cn, getAgentIcon } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "../ui/loading-skeletons/skeleton-base";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth-utils-client";
import { Agent } from "@prisma/client";
import { useChat } from "@ai-sdk/react";
// AI SDK 5.0: Import DefaultChatTransport for transport architecture
import { DefaultChatTransport } from "ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import useSWR from "swr";
import { toast } from "@/hooks/use-toast";
import { ParsedChat } from "@/types";
import { Loader2 } from "lucide-react";
import { AVATAR_OPTIONS } from "./agent/agent-avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { getThemeColors } from "@/utils/theme-colors";
import { DEFAULT_SIGNOUT_REDIRECT } from "@/config/defaults";
import { Palette } from "lucide-react";

interface MenuProps {
  chatId?: string;
  onItemClick?: () => void; // Callback to close mobile menu when an item is clicked
}

interface AgentAPIResponse {
  data: Agent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function NewMenuMobile({ chatId, onItemClick }: MenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout: Logout } = useAuth();
  const searchParams = useSearchParams();
  const currentAgentId = searchParams.get("agentId") || "";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedAgentInfo, setSelectedAgentInfo] = useState({
    name: "default",
    id: "",
  });
  const [selectedModelId] = useState("gemini-2.5-flash");
  const [isReasoningEnabled] = useState(true);
  const [newChatId, setNewChatId] = useState("");

  const { systemSetting } = useSystemSettings();

  // Pagination states
  const [chatPage, setChatPage] = useState(1);
  const [agentPage, setAgentPage] = useState(1);
  const [chatsPerPage] = useState(5);
  const [agentsPerPage] = useState(5);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [hasMoreAgents, setHasMoreAgents] = useState(true);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const [loadingMoreAgents, setLoadingMoreAgents] = useState(false);
  const [visibleChats, setVisibleChats] = useState<ParsedChat[]>([]);
  const [visibleAgents, setVisibleAgents] = useState<any[]>([]);

  // Chat search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [isChatSearchMode, setIsChatSearchMode] = useState(false);
  const [searchedChats, setSearchedChats] = useState<ParsedChat[]>([]);
  const [isSearchingChats, setIsSearchingChats] = useState(false);

  // Agent search states
  const [agentSearchQuery, setAgentSearchQuery] = useState<string>("");
  const [debouncedAgentSearchQuery, setDebouncedAgentSearchQuery] =
    useState<string>("");
  const [isAgentSearchMode, setIsAgentSearchMode] = useState(false);
  const [searchedAgents, setSearchedAgents] = useState<any[]>([]);
  const [isSearchingAgents, setIsSearchingAgents] = useState(false);

  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [loadingAgentId, setLoadingAgentId] = useState<string | null>(null);
  const [showAgentChangeDialog, setShowAgentChangeDialog] = useState(false);
  const [pendingAgentInfo, setPendingAgentInfo] = useState<{
    name: string;
    id: string;
  } | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const isBaznasTheme = process.env.NEXT_PUBLIC_BAZNAS_THEME === "true";
  const themeColors = getThemeColors();
  const hasThemeAccessSetting = process.env.USING_CUSTOMIZE_THEME === "true"

  // Get chat title function - MOVED UP before it's used
  const getChatTitle = useCallback((chat: ParsedChat): string => {
    const firstUserMessage = chat.messages.find(
      (message) => message.role === "user"
    );
    const content = firstUserMessage?.content;
    if (!content) return "New Chat";

    // Split into words and rejoin until we reach roughly 20 characters
    const words = content.split(" ");
    let title = "";
    let i = 0;

    while (i < words.length && (title + words[i]).length <= 20) {
      title += (i === 0 ? "" : " ") + words[i];
      i++;
    }

    return title + (i < words.length ? "..." : "");
  }, []);

  const getAvatarInfo = (imageId?: string) => {
    return (
      AVATAR_OPTIONS.find((avatar) => avatar.id === imageId) ||
      AVATAR_OPTIONS[0]
    );
  };

  // Debounce chat search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Debounce agent search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAgentSearchQuery(agentSearchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [agentSearchQuery]);

  // Handle chat search API call
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      setIsChatSearchMode(true);
      searchChats(debouncedSearchQuery);
    } else {
      setIsChatSearchMode(false);
      setSearchedChats([]);
    }
  }, [debouncedSearchQuery]);

  // Handle agent search API call
  useEffect(() => {
    if (debouncedAgentSearchQuery.trim()) {
      setIsAgentSearchMode(true);
      searchAgents(debouncedAgentSearchQuery);
    } else {
      setIsAgentSearchMode(false);
      setSearchedAgents([]);
    }
  }, [debouncedAgentSearchQuery]);

  // Function to search chats via API
  const searchChats = async (query: string) => {
    if (!session?.user || !query.trim()) return;

    setIsSearchingChats(true);
    try {
      const response = await fetch(
        `/api/chat/search?q=${encodeURIComponent(query)}&limit=50`
      );

      if (!response.ok) {
        throw new Error("Failed to search chats");
      }

      const data = await response.json();

      // Parse the search results
      const parsed: ParsedChat[] = data.map((chat: any) => ({
        ...chat,
        messages:
          typeof chat.messages === "string"
            ? JSON.parse(chat.messages)
            : chat.messages,
        id: chat.id,
        createdAt: new Date(chat.createdAt),
        userId: chat.userId,
      }));

      setSearchedChats(parsed);
    } catch (error) {
      console.error("Error searching chats:", error);
      toast({
        title: "Error",
        description: "Failed to search chats",
        variant: "destructive",
      });
      setSearchedChats([]);
    } finally {
      setIsSearchingChats(false);
    }
  };

  // Function to search agents via API
  const searchAgents = async (query: string) => {
    if (!session?.user || !query.trim()) return;

    setIsSearchingAgents(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V2
        }/agent?page=1&page_size=50&search_fields=agentName&search_value=${encodeURIComponent(
          query
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.user.backendToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search agents");
      }

      const data = await response.json();
      const agents = data.data.founds;

      // Process the search results
      let agentsArray: Agent[] = [];
      if (Array.isArray(agents)) {
        agentsArray = agents;
      } else if (agents && agents.data && Array.isArray(agents.data)) {
        agentsArray = agents.data;
      }

      const items = agentsArray.map((agent) => {
        const avatarInfo = getAvatarInfo(agent.image || undefined);
        const Icon = agent.image
          ? avatarInfo.icon
          : getAgentIcon(agent.agentName);
        return {
          id: agent.id,
          title: agent.agentName,
          href: `/chatbot?agentId=${agent.id}&selectedAgentNameProps=${agent.agentName}`,
          icon: Icon,
          description: agent.description || "",
          image: agent.image, // Add image field
          gradient: agent.image ? avatarInfo.gradient : undefined, // Add gradient if using avatar
        };
      });

      setSearchedAgents(items);
    } catch (error) {
      console.error("Error searching agents:", error);
      toast({
        title: "Error",
        description: "Failed to search agents",
        variant: "destructive",
      });
      setSearchedAgents([]);
    } finally {
      setIsSearchingAgents(false);
    }
  };

  // Handle chat search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle agent search change
  const handleAgentSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgentSearchQuery(e.target.value);
  };

  useEffect(() => {
    if (newChatId && !chatId) {
      router.push(`/chatbot/${newChatId}`);
      if (onItemClick) onItemClick();
    }
  }, [newChatId, router, chatId, onItemClick]);

  // AI SDK 5.0: Use transport architecture instead of api/body options
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          id: chatId,
          activeChatId: chatId,
          agentId: selectedAgentInfo.id || "",
          agentName: selectedAgentInfo.name || "KnowgenAI",
          selectedModelId,
          isReasoningEnabled,
        },
      }),
    [chatId, selectedAgentInfo.id, selectedAgentInfo.name, selectedModelId, isReasoningEnabled]
  );

  // Initialize useChat hook - AI SDK 5.0: onResponse removed
  const { setMessages } = useChat({
    transport: chatTransport,
    onFinish: () => {
      console.log("Chat stream finished");
    },
  });

  // For mobile, we want sections expanded by default
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    "Recent Chats": true,
    "Agents List": true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Fetch chat history data (only when not in search mode)
  const {
    data: rawHistory,
    isLoading: isHistoryLoading,
    mutate: mutateChats,
  } = useSWR<any[]>(
    session?.user && !isChatSearchMode
      ? ["/api/chat", chatPage, chatsPerPage]
      : null,
    async ([url, page, limit]) => {
      const res = await fetch(`${url}?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      return res.json();
    }
  );

  // Fetch agents data with pagination (only when not in search mode)
  const {
    data: agentsData,
    isLoading: isAgentsLoading,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutate: mutateAgents,
  } = useSWR<Agent[] | AgentAPIResponse>(
    session?.user && !isAgentSearchMode
      ? ["/api/agent/user-assigned", agentPage, agentsPerPage]
      : null,
    async ([url, page, limit]: [string, number, number]) => {
      try {
        // const offset = (page - 1) * limit;
        const res = await fetch(`${url}?offset=${page}&limit=${limit}`);

        if (res.status === 401) {
          Logout(DEFAULT_SIGNOUT_REDIRECT);
          router.push('/signin');
          throw new Error('Unauthorized - redirecting to signin');
        }

        if (!res.ok) throw new Error("Failed to fetch agents");

        const data = await res.json();

        // Handle different response formats
        if (data && data.data && Array.isArray(data.data)) {
          // Paginated format
          setHasMoreAgents(page < data.totalPages);
          return data;
        } else if (Array.isArray(data)) {
          // Direct array format
          setHasMoreAgents(data.length >= limit);
          return data;
        } else {
          console.error("Unexpected API response format:", data);
          return {
            data: [],
            total: 0,
            page: 1,
            pageSize: limit,
            totalPages: 1,
          };
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
        return { data: [], total: 0, page: 1, pageSize: limit, totalPages: 1 };
      } finally {
        setLoadingMoreAgents(false);
      }
    }
  );

  // Parse the chat data and update visible chats (only when not in search mode)
  useMemo(() => {
    if (!rawHistory || isChatSearchMode) return;

    const parsed: ParsedChat[] = rawHistory.map((chat) => ({
      ...chat,
      messages:
        typeof chat.messages === "string"
          ? JSON.parse(chat.messages)
          : chat.messages,
      id: chat.id,
      createdAt: new Date(chat.createdAt),
      userId: chat.userId,
    }));

    // Append new chats or replace based on page number
    if (chatPage === 1) {
      setVisibleChats(parsed);
    } else {
      setVisibleChats((prev) => {
        // Use an array instead of a Set
        const existingIds = prev.map((chat) => chat.id);

        // Filter out any chats that already exist in the list
        const newUniqueChats = parsed.filter(
          (chat) => !existingIds.includes(chat.id)
        );

        // Return the combined list
        return [...prev, ...newUniqueChats];
      });
    }

    setHasMoreChats(parsed.length === chatsPerPage);
    setLoadingMoreChats(false);
  }, [rawHistory, chatPage, chatsPerPage, isChatSearchMode]);

  // Process agents data (only when not in search mode)
  useMemo(() => {
    if (!agentsData || isAgentSearchMode) return [];
    let agentsArray: Agent[] = [];

    if (Array.isArray(agentsData)) {
      // Direct array format
      agentsArray = agentsData;
    } else if (
      agentsData &&
      agentsData.data &&
      Array.isArray(agentsData.data)
    ) {
      // Paginated format
      agentsArray = agentsData.data;
    } else {
      console.error("Could not extract agents array from:", agentsData);
      return;
    }

    const items = agentsArray.map((agent) => {
      const avatarInfo = getAvatarInfo(agent.image || undefined);
      const Icon = agent.image
        ? avatarInfo.icon
        : getAgentIcon(agent.agentName);
      return {
        id: agent.id,
        title: agent.agentName,
        href: `/chatbot?agentId=${agent.id}&selectedAgentNameProps=${agent.agentName}`,
        icon: Icon,
        description: agent.description || "",
        image: agent.image, // Add image field
        gradient: agent.image ? avatarInfo.gradient : undefined, // Add gradient if using avatar
      };
    });

    // If it's the first page, replace the array
    if (agentPage === 1) {
      setVisibleAgents(items);
    } else {
      // Otherwise, append new items but avoid duplicates
      setVisibleAgents((prev) => {
        // Use an array and includes instead of a Set
        const existingIds = prev.map((agent) => agent.id);

        // Filter out any agents that already exist in the list
        const newUniqueAgents = items.filter(
          (agent) => !existingIds.includes(agent.id)
        );

        // Return the combined list
        return [...prev, ...newUniqueAgents];
      });
    }

    setLoadingMoreAgents(false);
  }, [agentsData, agentPage, isAgentSearchMode]);

  // Get the chats to display (either search results or paginated results)
  const chatsToDisplay = isChatSearchMode ? searchedChats : visibleChats;

  // Get the agents to display (either search results or paginated results)
  const agentsToDisplay = isAgentSearchMode ? searchedAgents : visibleAgents;

  // Load more chats (only works in non-search mode)
  const loadMoreChats = useCallback(async () => {
    if (loadingMoreChats || !hasMoreChats || isChatSearchMode) return;

    setLoadingMoreChats(true);
    setChatPage((prev) => prev + 1);
  }, [hasMoreChats, loadingMoreChats, isChatSearchMode]);

  // Load more agents (only works in non-search mode)
  const loadMoreAgents = useCallback(async () => {
    if (loadingMoreAgents || !hasMoreAgents || isAgentSearchMode) return;

    setLoadingMoreAgents(true);
    setAgentPage((prev) => prev + 1);
  }, [hasMoreAgents, loadingMoreAgents, isAgentSearchMode]);

  // Handle chat selection
  const handleSelectChat = useCallback(
    async (selectedChatId: string) => {
      setLoadingChatId(selectedChatId);
      try {
        const response = await fetch(`/api/chat/${selectedChatId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch chat");
        }

        const chat = await response.json();

        if (chat.agent) {
          setSelectedAgentInfo({
            name: chat.agent.agentName || "Default Agent",
            id: chat.agent.id || "",
          });
        }

        setMessages(chat.messages);
        router.push(`/chatbot/${selectedChatId}`);
        if (onItemClick) onItemClick();
      } catch (error) {
        console.error("Error loading chat:", error);
        toast({
          title: "Error",
          description: "Failed to load chat",
          variant: "destructive",
        });
      } finally {
        setTimeout(() => setLoadingChatId(null), 1000);
      }
    },
    [router, setMessages, onItemClick]
  );

  // Handle chat deletion
  const handleDelete = async () => {
    if (!deleteId || !session?.user) return;

    try {
      const response = await fetch(`/api/chat/${deleteId}`, {
        method: "PUT",
      });

      if (!response.ok) throw new Error("Failed to delete chat");

      await mutateChats();
      setShowDeleteDialog(false);

      if (pathname?.includes(deleteId)) {
        router.push("/chatbot");
        if (onItemClick) onItemClick();
      }

      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  const handleAgentSelect = useCallback(
    (agentName: string, agentId: string) => {
      // Remove the early return condition to allow reselection
      // if (agentId === selectedAgentInfo.id) {
      //   return;
      // }

      // Store the agent info temporarily
      setPendingAgentInfo({
        name: agentName === "default" ? "KnowgenAI" : agentName,
        id: agentId || "",
      });

      // Show confirmation dialog
      setShowAgentChangeDialog(true);
    },
    [selectedAgentInfo.id]
  );

  // Function to execute after confirmation
  const confirmAgentChange = useCallback(async () => {
    if (!pendingAgentInfo) return;

    const { name: agentName, id: agentId } = pendingAgentInfo;

    setLoadingAgentId(agentId);
    try {
      // Update the selected agent info
      const newAgent = {
        name: agentName,
        id: agentId,
      };

      console.log("New agent selected", newAgent);

      // Clear any existing chat ID and messages
      setNewChatId("");
      setMessages([]);
      setSelectedAgentInfo(newAgent);

      // Navigate to chatbot with agent query parameter
      router.push(
        `/chatbot?agentId=${agentId}&selectedAgentNameProps=${encodeURIComponent(
          agentName
        )}`
      );

      // Close the dialog
      setShowAgentChangeDialog(false);
      setPendingAgentInfo(null);

      if (onItemClick) onItemClick();
    } catch (error) {
      console.error("Error selecting agent:", error);
      toast({
        title: "Error",
        description: "Failed to select agent",
        variant: "destructive",
      });
    } finally {
      // Clear loading state after a short delay
      setTimeout(() => setLoadingAgentId(null), 1000);
    }
  }, [pendingAgentInfo, router, setMessages, setNewChatId, onItemClick]);

  // Function to cancel agent change
  const cancelAgentChange = useCallback(() => {
    setShowAgentChangeDialog(false);
    setPendingAgentInfo(null);
  }, []);

  const handleTimeOutChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const timeoutMinutes = parseInt(formData.get("timeout") as string, 10);
    const warningSeconds = parseInt(formData.get("warning") as string, 10);

    // Validation
    if (isNaN(timeoutMinutes) || timeoutMinutes < 1) {
      toast({
        variant: "destructive",
        title: "Invalid timeout value",
        description: "Please enter a valid number of minutes (minimum 1)",
      });
      return;
    }

    if (isNaN(warningSeconds) || warningSeconds < 1) {
      toast({
        variant: "destructive",
        title: "Invalid warning time",
        description: "Please enter a valid number of seconds (minimum 1)",
      });
      return;
    }

    try {
      // Convert minutes to seconds for the API
      const timeoutSeconds = timeoutMinutes * 60;

      const response = await fetch("/api/timeout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeout: timeoutSeconds,
          warning: warningSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update timeout");
      }

      toast({
        title: "Success",
        description: `Session timeout settings updated successfully`,
      });

      setIsSettingsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update session timeout settings : " + error,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 overflow-auto">
          {/* Recents Section - With search and pagination */}
          <div className="mb-2">
            <div
              className="flex items-center mb-2 cursor-pointer px-2 justify-between"
              onClick={() => toggleSection("Recent Chats")}
            >
              <h2 className="text-sm font-medium text-gray-500">
                Recent Chats
                {isChatSearchMode && debouncedSearchQuery && (
                  <span className={`text-xs ${themeColors.textPrimary} ml-1`}>
                    (searching: &quot;{debouncedSearchQuery}&quot;)
                  </span>
                )}
              </h2>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-500 transition-transform",
                  expandedSections["Recent Chats"] ? "transform rotate-180" : ""
                )}
              />
            </div>

            {expandedSections["Recent Chats"] && (
              <div>
                {/* Chat Search */}
                <div className="relative mb-3 px-2">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search all chats..."
                    className="pl-8 h-8 text-xs"
                    aria-label="Search All Chats"
                  />
                  {isSearchingChats && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 animate-spin text-gray-400" />
                  )}
                </div>

                <ul className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
                  {(isHistoryLoading && chatPage === 1 && !isChatSearchMode) ||
                    isSearchingChats ? (
                    // Loading state
                    Array(3)
                      .fill(0)
                      .map((_, index) => (
                        <li key={`loading-${index}`}>
                          <div className="w-full h-9 px-2 flex items-center justify-start">
                            <Skeleton className="h-4 w-4 rounded-full mr-2" />
                            <Skeleton className="h-4 w-32" />

                          </div>
                        </li>
                      ))
                  ) : !session?.user ? (
                    // Not logged in state
                    <li className="text-center text-sm text-gray-500 py-2">
                      Log in to see your recent chats
                    </li>
                  ) : chatsToDisplay.length === 0 ? (
                    // No chats state
                    <li className="text-center text-sm text-gray-500 py-2">
                      {isChatSearchMode && debouncedSearchQuery
                        ? `No chats found for "${debouncedSearchQuery}"`
                        : "No recent conversations"}
                    </li>
                  ) : (
                    // Display actual chats
                    chatsToDisplay.map((chat: ParsedChat, index) => (
                      <li
                        key={`${chat.id}-${index}`}
                        className="group rounded-md transition-colors duration-200"
                      >
                        <div className="flex items-center w-full">
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full h-9 text-sm font-normal relative cursor-pointer",
                              isBaznasTheme
                                ? "hover:bg-green-100 dark:hover:bg-green-900/20"
                                : "hover:bg-gray-200 dark:hover:bg-zinc-800",
                              pathname?.includes(chat.id) ||
                                loadingChatId === chat.id
                                ? isBaznasTheme
                                  ? "bg-green-100 dark:bg-green-900/20 border-l-2 border-green-600"
                                  : `bg-gray-100 dark:bg-zinc-800/20 border-l-2 ${themeColors.borderPrimary}`
                                : "",
                              "px-2 justify-between",
                              loadingChatId === chat.id && "cursor-wait"
                            )}
                            onClick={() => handleSelectChat(chat.id)}
                            disabled={loadingChatId === chat.id}
                          >
                            <div className="flex items-center">
                              {loadingChatId === chat.id ? (
                                <Loader2
                                  className={`h-4 w-4 ${themeColors.textPrimary} animate-spin mr-2`}
                                />
                              ) : (
                                <MessageSquare
                                  className={cn(
                                    "h-4 w-4 mr-2",
                                    pathname?.includes(chat.id)
                                      ? isBaznasTheme
                                        ? "text-green-600 dark:text-green-400"
                                        : themeColors.textPrimary
                                      : isBaznasTheme
                                        ? "text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400"
                                        : `text-gray-500 group-hover:${themeColors.textPrimary}`
                                  )}
                                />
                              )}
                              <span
                                className={cn(
                                  "truncate text-left",
                                  pathname?.includes(chat.id)
                                    ? isBaznasTheme
                                      ? "font-medium text-green-700 dark:text-green-400"
                                      : `font-medium ${themeColors.textPrimary}`
                                    : isBaznasTheme
                                      ? "group-hover:font-medium group-hover:text-green-800 dark:group-hover:text-green-300"
                                      : "group-hover:font-medium group-hover:text-gray-900 dark:group-hover:text-white"
                                )}
                              >
                                {getChatTitle(chat)}
                              </span>
                            </div>

                            <div
                              className="flex items-center transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(chat.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600 group-hover:text-gray-500" />
                            </div>
                          </Button>
                        </div>
                      </li>
                    ))
                  )}

                  {/* Loading indicator when fetching more chats */}
                  {loadingMoreChats && !isChatSearchMode && (
                    <li className="text-center py-1">
                      <div className="flex justify-center items-center space-x-1">
                        <div
                          className={`h-2 w-2 bg-${themeColors.primaryLight} rounded-full animate-bounce`}
                        ></div>
                        <div
                          className={`h-2 w-2 bg-${themeColors.primaryLight} rounded-full animate-bounce`}
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className={`h-2 w-2 bg-${themeColors.primaryLight} rounded-full animate-bounce`}
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </li>
                  )}

                  {chatsToDisplay.length > 0 &&
                    hasMoreChats &&
                    !isChatSearchMode && (
                      <li>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start h-9 px-2 text-sm font-normal cursor-pointer",
                            isBaznasTheme
                              ? "text-gray-500 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-300"
                              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          )}
                          onClick={loadMoreChats}
                          disabled={loadingMoreChats}
                        >
                          <ChevronDown className="mr-2 h-4 w-4" />
                          <span>Show more</span>
                        </Button>
                      </li>
                    )}

                  {/* Search results info for chats */}
                  {isChatSearchMode && chatsToDisplay.length > 0 && (
                    <li className="text-center text-xs text-gray-400 py-1">
                      Found {chatsToDisplay.length} chat
                      {chatsToDisplay.length !== 1 ? "s" : ""}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Agents Section - With search and pagination */}
          <div className="mb-6">
            <div
              className="flex items-center mb-2 cursor-pointer px-2 justify-between"
              onClick={() => toggleSection("Agents List")}
            >
              <h2 className="text-sm font-medium text-gray-500">
                Agents List
                {isAgentSearchMode && debouncedAgentSearchQuery && (
                  <span className={`text-xs ${themeColors.textPrimary} ml-1`}>
                    (searching: &quot;{debouncedAgentSearchQuery}&quot;)
                  </span>
                )}
              </h2>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-500 transition-transform",
                  expandedSections["Agents List"] ? "transform rotate-180" : ""
                )}
              />
            </div>

            {expandedSections["Agents List"] && (
              <div>
                {/* Agent Search */}
                <div className="relative mb-3 px-2">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="search"
                    value={agentSearchQuery}
                    onChange={handleAgentSearchChange}
                    placeholder="Search all agents..."
                    className="pl-8 h-8 text-xs"
                    aria-label="Search All Agents"
                  />
                  {isSearchingAgents && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 animate-spin text-gray-400" />
                  )}
                </div>

                <ul className="space-y-1 max-h-[25vh] overflow-y-auto pr-1">
                  {(isAgentsLoading && agentPage === 1 && !isAgentSearchMode) ||
                    isSearchingAgents ? (
                    // Loading state for agents
                    Array(3)
                      .fill(0)
                      .map((_, index) => (
                        <li key={`loading-agent-${index}`}>
                          <div className="w-full h-9 px-2 flex items-center justify-start">
                            <Skeleton className="h-4 w-4 rounded-full mr-2" />
                            <Skeleton className="h-4 w-32" />

                          </div>
                        </li>
                      ))
                  ) : !session?.user ? (
                    // Not logged in state
                    <li className="text-center text-sm text-gray-500 py-2">
                      Log in to see available agents
                    </li>
                  ) : agentsToDisplay.length === 0 ? (
                    // No agents state
                    <li className="text-center text-sm text-gray-500 py-2">
                      {isAgentSearchMode && debouncedAgentSearchQuery
                        ? `No agents found for "${debouncedAgentSearchQuery}"`
                        : "No agents available"}
                    </li>
                  ) : (
                    // Display actual agents
                    agentsToDisplay.map((item, index) => (
                      <li
                        key={`${item.id}-${index}`}
                        className="group rounded-md transition-colors duration-200"
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-9 text-sm font-normal relative cursor-pointer",
                            isBaznasTheme
                              ? "hover:bg-green-100 dark:hover:bg-green-900/20"
                              : "hover:bg-gray-200 dark:hover:bg-gray-700",
                            currentAgentId === item.id
                              ? isBaznasTheme
                                ? "bg-green-100 dark:bg-green-900/20 border-l-2 border-green-600"
                                : `bg-gray-100 dark:bg-gray-900 border-l-2 ${themeColors.borderPrimary}`
                              : "",
                            "px-2 justify-start",
                            loadingAgentId === item.id && "cursor-wait"
                          )}
                          onClick={() => handleAgentSelect(item.title, item.id)}
                          disabled={loadingAgentId === item.id}
                        >
                          {loadingAgentId === item.id ? (
                            <Loader2
                              className={`h-5 w-5 ${themeColors.textPrimary} animate-spin mr-2`}
                            />
                          ) : (
                            <div
                              className={cn(
                                "flex items-center justify-center h-5 w-5 rounded-full mr-2",
                                item.image && item.gradient
                                  ? `bg-gradient-to-br ${item.gradient}`
                                  : selectedAgentInfo.id === item.id
                                    ? `bg-${themeColors.primaryLight
                                    } ${themeColors.textPrimary
                                      .replace("text-", "text-")
                                      .replace("-600", "-700")}`
                                    : `bg-${themeColors.primaryLight.replace(
                                      "-400",
                                      "-100"
                                    )} ${themeColors.textPrimary
                                    } group-hover:bg-${themeColors.primaryLight
                                    } group-hover:${themeColors.textPrimary
                                      .replace("text-", "text-")
                                      .replace("-600", "-700")}`
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "h-3 w-3",
                                  // Use white text for gradient backgrounds, colored text for solid backgrounds
                                  item.image && item.gradient
                                    ? "text-white"
                                    : ""
                                )}
                              />
                            </div>
                          )}
                          <span
                            className={cn(
                              "truncate",
                              selectedAgentInfo.id === item.id
                                ? isBaznasTheme
                                  ? "font-medium text-green-700 dark:text-green-400"
                                  : `font-medium ${themeColors.textPrimary}`
                                : isBaznasTheme
                                  ? "group-hover:font-medium group-hover:text-green-800 dark:group-hover:text-green-300"
                                  : "group-hover:font-medium group-hover:text-gray-900 dark:group-hover:text-white"
                            )}
                          >
                            {item.title}
                          </span>
                        </Button>
                      </li>
                    ))
                  )}

                  {/* Loading indicator when fetching more agents */}
                  {loadingMoreAgents && !isAgentSearchMode && (
                    <li className="text-center py-1">
                      <div className="flex justify-center items-center space-x-1">
                        <div
                          className={`h-2 w-2 bg-${themeColors.primaryLight} rounded-full animate-bounce`}
                        ></div>
                        <div
                          className={`h-2 w-2 bg-${themeColors.primaryLight} rounded-full animate-bounce`}
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className={`h-2 w-2 bg-${themeColors.primaryLight} rounded-full animate-bounce`}
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </li>
                  )}

                  {/* Show more button - only in pagination mode */}
                  {agentsToDisplay.length > 0 &&
                    hasMoreAgents &&
                    !isAgentSearchMode && (
                      <li>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start h-9 px-2 text-sm font-normal cursor-pointer",
                            isBaznasTheme
                              ? "text-gray-500 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-300"
                              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          )}
                          onClick={loadMoreAgents}
                          disabled={loadingMoreAgents}
                        >
                          <ChevronDown className="mr-2 h-4 w-4" />
                          <span>Show more</span>
                        </Button>
                      </li>
                    )}

                  {/* Search results info for agents */}
                  {isAgentSearchMode && agentsToDisplay.length > 0 && (
                    <li className="text-center text-xs text-gray-400 py-1">
                      Found {agentsToDisplay.length} agent
                      {agentsToDisplay.length !== 1 ? "s" : ""}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Navigation - Fixed at the bottom */}
      <div
        className={cn(
          "border-t border-gray-200 dark:border-gray-800 bg-background pt-2 pb-18",
          isBaznasTheme ? "bg-[#ecfff6] dark:bg-background" : ""
        )}
      >
        {/* Dashboard */}
        <Link href="/dashboard" className="-ml-[10px]" onClick={onItemClick}>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-10 text-sm mb-1 cursor-pointer",
              isBaznasTheme
                ? "hover:bg-green-100 dark:hover:bg-green-900/20"
                : "hover:bg-gray-200 dark:hover:bg-zinc-800",
              pathname === "/dashboard"
                ? isBaznasTheme
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-gray-200 dark:bg-zinc-800/20"
                : "",
              "px-2 justify-start"
            )}
          >
            <LayoutList
              className={cn(
                "h-5 w-5 mr-2",
                pathname === "/dashboard" && isBaznasTheme
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500"
              )}
            />
            <span
              className={cn(
                pathname === "/dashboard" && isBaznasTheme
                  ? "text-green-700 dark:text-green-400"
                  : ""
              )}
            >
              Dashboard
            </span>
          </Button>
        </Link>

        {/* Agent */}
        <Link href="/agent" className="-ml-[10px]" onClick={onItemClick}>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-10 text-sm mb-1 cursor-pointer",
              isBaznasTheme
                ? "hover:bg-green-100 dark:hover:bg-green-900/20"
                : "hover:bg-gray-200 dark:hover:bg-zinc-800",
              pathname === "/agent"
                ? isBaznasTheme
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-gray-200 dark:bg-zinc-800/20"
                : "",
              "px-2 justify-start"
            )}
          >
            <Cpu
              className={cn(
                "h-5 w-5 mr-2",
                pathname === "/agent" && isBaznasTheme
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500"
              )}
            />
            <span
              className={cn(
                pathname === "/agent" && isBaznasTheme
                  ? "text-green-700 dark:text-green-400"
                  : ""
              )}
            >
              Agent
            </span>
          </Button>
        </Link>

        {/* Knowledge */}
        <Link href="/knowledge" className="-ml-[10px]" onClick={onItemClick}>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-10 text-sm mb-1 cursor-pointer",
              isBaznasTheme
                ? "hover:bg-green-100 dark:hover:bg-green-900/20"
                : "hover:bg-gray-200 dark:hover:bg-zinc-800",
              pathname === "/knowledge"
                ? isBaznasTheme
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-gray-200 dark:bg-zinc-800/20"
                : "",
              "px-2 justify-start"
            )}
          >
            <Wrench
              className={cn(
                "h-5 w-5 mr-2",
                pathname === "/knowledge" && isBaznasTheme
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500"
              )}
            />
            <span
              className={cn(
                pathname === "/knowledge" && isBaznasTheme
                  ? "text-green-700 dark:text-green-400"
                  : ""
              )}
            >
              Knowledge
            </span>
          </Button>
        </Link>

        {/* Settings with dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-10 text-sm cursor-pointer",
                isBaznasTheme
                  ? "hover:bg-green-100 dark:hover:bg-green-900/20"
                  : "hover:bg-gray-200 dark:hover:bg-accent",
                pathname === "/settings"
                  ? isBaznasTheme
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-gray-100"
                  : "",
                "px-2 justify-start"
              )}
            >
              <Settings
                className={cn(
                  "h-5 w-5 mr-2",
                  pathname === "/settings" && isBaznasTheme
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500"
                )}
              />
              <span
                className={cn(
                  pathname === "/settings" && isBaznasTheme
                    ? "text-green-700 dark:text-green-400"
                    : ""
                )}
              >
                Settings
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            side="top"
            className={cn(
              "w-48",
              isBaznasTheme ? "bg-[#ecfff6] dark:bg-background" : ""
            )}
          >
            <DropdownMenuItem
              asChild
              className={cn(
                "flex items-center px-4 py-2 cursor-pointer",
                isBaznasTheme
                  ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20"
                  : "data-[highlighted]:bg-gray-100"
              )}
            >
              <Users className="h-5 w-5 mr-3 text-gray-500" />
              <Link
                href="/users"
                className="flex w-full text-sm"
                onClick={onItemClick}
              >
                User Management
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              asChild
              className={cn(
                "flex items-center px-4 py-2 cursor-pointer",
                isBaznasTheme
                  ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20"
                  : "data-[highlighted]:bg-gray-100"
              )}
            >
              <UserPlus className="h-5 w-5 mr-3 text-gray-500" />
              <Link
                href="/invited-user"
                className="flex w-full text-sm"
                onClick={onItemClick}
              >
                Invite Users
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              asChild
              className={cn(
                "flex items-center px-4 py-2 cursor-pointer",
                isBaznasTheme
                  ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20"
                  : "data-[highlighted]:bg-gray-100"
              )}
            >
              <ShieldCheck className="h-5 w-5 mr-3 text-gray-500" />
              <Link
                href="/acl"
                className="flex w-full text-sm"
                onClick={onItemClick}
              >
                ACL Management
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              asChild
              className={cn(
                "flex items-center px-4 py-2 cursor-pointer",
                isBaznasTheme
                  ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20"
                  : "data-[highlighted]:bg-gray-100"
              )}
            >
              <Key className="h-5 w-5 mr-3 text-gray-500" />
              <Link
                href="/credentials"
                className="flex w-full text-sm"
                onClick={onItemClick}
              >
                Credentials
              </Link>
            </DropdownMenuItem>

            {session?.user?.roles?.includes("superadmin") && (
              <DropdownMenuItem
                asChild
                className={cn(
                  "flex items-center px-4 py-2 cursor-pointer",
                  isBaznasTheme
                    ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20"
                    : "data-[highlighted]:bg-gray-100"
                )}
              >
                <Building className="h-5 w-5 mr-3 text-gray-500" />
                <Link href="/organization" className="flex w-full text-sm">
                  Organization
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className={cn(
              "flex items-center px-4 py-2 cursor-pointer",
              isBaznasTheme ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20" : "data-[highlighted]:bg-gray-100"
            )}>
              <ScrollText className="h-5 w-5 mr-3 text-gray-500" />
              <Link href="/audit-logs" className="flex w-full text-sm">
                Audit Logs
              </Link>
            </DropdownMenuItem>

            {(session?.user?.roles?.includes("admin") ||
              session?.user?.roles?.includes("superadmin")) && (
                <DropdownMenuItem
                  onSelect={() => setIsSettingsDialogOpen(true)}
                  className={cn(
                    "flex items-center px-4 py-2 cursor-pointer",
                    isBaznasTheme
                      ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20"
                      : "data-[highlighted]:bg-gray-100"
                  )}
                >
                  <Settings className="h-4 w-4 mr-3 text-muted-foreground" />
                  Timeout Settings
                </DropdownMenuItem>
              )}

            {((session?.user?.roles?.includes("superadmin")) && hasThemeAccessSetting) && (
              <DropdownMenuItem
                className={cn(
                  "flex items-center px-4 py-2 cursor-pointer",
                  isBaznasTheme
                    ? "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900/20"
                    : "data-[highlighted]:bg-gray-100"
                )}
              >
                <Palette className="h-5 w-5 mr-3 text-gray-500" />
                <Link
                  href="/theme-setting"
                  className="flex w-full text-sm"
                  onClick={onItemClick}
                >
                  Theme Setting
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Agent Change Confirmation Dialog */}
      <AlertDialog
        open={showAgentChangeDialog}
        onOpenChange={setShowAgentChangeDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAgentInfo.id === pendingAgentInfo?.id
                ? "Start New Session"
                : selectedAgentInfo.id
                  ? "Change Agent"
                  : "Start Conversation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAgentInfo.id === pendingAgentInfo?.id
                ? `Do you want to start a new conversation with ${pendingAgentInfo?.name}? Your current conversation will be saved.`
                : selectedAgentInfo.id
                  ? `Switching to ${pendingAgentInfo?.name} will start a new conversation. Your current conversation will be saved. Do you want to continue?`
                  : `Do you want to start with ${pendingAgentInfo?.name} conversation?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAgentChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAgentChange}>
              {selectedAgentInfo.id === pendingAgentInfo?.id
                ? "Start New Session"
                : selectedAgentInfo.id
                  ? "Change Agent"
                  : "Start Chat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Setting Dialog */}
      <Dialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/50 dark:bg-black/70 z-100" />
          <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 rounded-lg p-6 sm:max-w-[425px] w-full z-101">
            <DialogHeader>
              <DialogTitle>Session Timeout Settings</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-muted-foreground font-normal">
                Set the session timeout for your account. If you do not log in
                within this time, your account will be logged out automatically.
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-4" />
            <form onSubmit={handleTimeOutChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeout">Session Timeout (in minutes)</Label>
                <div className="relative">
                  <Input
                    id="timeout"
                    name="timeout"
                    type="number"
                    min="1"
                    placeholder="Enter timeout in minutes"
                    defaultValue={
                      systemSetting?.sessionTimeout
                        ? Math.floor(systemSetting.sessionTimeout / 60)
                        : 10
                    }
                    required
                    className="dark:bg-gray-800"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Set the duration of user inactivity before automatic logout
                  (in minutes)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warning">Warning Time (in seconds)</Label>
                <div className="relative">
                  <Input
                    id="warning"
                    name="warning"
                    type="number"
                    min="1"
                    placeholder="Enter warning time in seconds"
                    defaultValue={systemSetting?.warningTime ?? 30}
                    required
                    className="dark:bg-gray-800"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Set how many seconds before timeout to show warning (in
                  seconds)
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
