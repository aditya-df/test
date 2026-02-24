"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessMarkdownUrls } from "@/components/chat/tools/markdown-preprocessor";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Download,
    Filter,
    RefreshCw,
    Activity,
    Users,
    Shield,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Eye,
    Clock,
    Building,
    LoaderCircle,
} from "lucide-react";
import { useAuth } from "@/utils/auth-utils-client";
import { toast } from "@/hooks/use-toast";
import useSWR from "swr";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from 'use-debounce';
import * as XLSX from 'xlsx';

interface AuditLogsContentProps {
    hasAccess?: boolean;
    sessionAuthConfig: any;
}

interface AuditLog {
    id: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    sessionId?: string;
    success: boolean;
    errorMessage?: string;
    chatId?: string;
    user?: {
        id: string;
        name?: string;
        email?: string;
        username?: string;
        organization?: Array<{
            organization?: {
                id: string;
                name?: string;
                email?: string;
                address?: string;
            }
        }>;
    };
}

interface AuditLogsResponse {
    data: AuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const ActionBadgeMap: Record<
    string,
    { color: string; icon: React.ComponentType<any> }
> = {
    LOGIN: {
        color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800",
        icon: Shield,
    },
    LOGOUT: {
        color:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800",
        icon: Activity,
    },
    LOGIN_FAILED: {
        color:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800",
        icon: AlertTriangle,
    },
    PASSWORD_RESET: {
        color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800",
        icon: Shield,
    },
    ACCOUNT_CREATED: {
        color:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800",
        icon: Users,
    },
    ACCOUNT_UPDATED: {
        color:
            "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800",
        icon: Users,
    },
    USER_ROLE_UPDATED: {
        color:
            "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800",
        icon: Users,
    },
    USER_DELETED: {
        color:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800",
        icon: Users,
    },
    USER_AGENTS_UPDATED: {
        color:
            "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800",
        icon: Activity,
    },
    USER_ORGANIZATION_UPDATED: {
        color:
            "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800",
        icon: Activity,
    },
    AGENT_CREATED: {
        color:
            "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-800",
        icon: Activity,
    },
    AGENT_UPDATED: {
        color:
            "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800",
        icon: Activity,
    },
    AGENT_DELETED: {
        color:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800",
        icon: Activity,
    },
    KNOWLEDGE_CREATED: {
        color:
            "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-800",
        icon: Activity,
    },
    KNOWLEDGE_UPDATED: {
        color:
            "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800",
        icon: Activity,
    },
    KNOWLEDGE_DELETED: {
        color:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800",
        icon: Activity,
    },
    CHAT_HISTORY: {
        color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800",
        icon: Activity,
    },
    CHAT_HISTORY_DELETED: {
        color:
            "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800",
        icon: Activity,
    },
    MESSAGE_FEEDBACK_GIVEN: {
        color:
            "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-800",
        icon: Activity,
    },
};

const actionOptions = [
    { value: "all", label: "All Actions" },
    { value: "LOGIN", label: "Login" },
    { value: "LOGOUT", label: "Logout" },
    { value: "LOGIN_FAILED", label: "Failed Login" },
    { value: "ACCOUNT_CREATED", label: "Account Created" },
    { value: "USER_ROLE_UPDATED", label: "User Role Updated" },
    { value: "USER_DELETED", label: "User Deleted" },
    { value: "USER_AGENTS_UPDATED", label: "User Agents Updated" },
    { value: "USER_ORGANIZATION_UPDATED", label: "User Organization Updated" },
    { value: "AGENT_CREATED", label: "Agent Created" },
    { value: "AGENT_UPDATED", label: "Agent Updated" },
    { value: "AGENT_DELETED", label: "Agent Deleted" },
    { value: "KNOWLEDGE_CREATED", label: "Knowledge Created" },
    { value: "KNOWLEDGE_UPDATED", label: "Knowledge Updated" },
    { value: "KNOWLEDGE_DELETED", label: "Knowledge Deleted" },
    { value: "CHAT_HISTORY", label: "Chat History" },
    { value: "CHAT_HISTORY_DELETED", label: "Chat History Deleted" },
    { value: "MESSAGE_FEEDBACK_GIVEN", label: "Message Feedback" },
];

export const AuditLogsContent = ({
    // hasAccess,
    // sessionAuthConfig,
}: AuditLogsContentProps) => {
    const { session } = useAuth();

    // Separate search input state from filters
    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        action: "all",
        userId: "",
        organizationId: "all",
        organizationName: "",
        startDate: "",
        endDate: "",
        search: "",
    });
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("feedback-info");

    // Debounce the search input with 500ms delay
    const [debouncedSearch] = useDebounce(searchInput, 500);

    // Update filters when debounced search changes
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            search: debouncedSearch,
            page: 1 // Reset to page 1 when search changes
        }));
    }, [debouncedSearch]);

    // Check if user has permission
    const hasPermission = session?.user?.roles?.includes("admin") || session?.user?.roles?.includes("superadmin") || session?.user?.roles?.includes("user");

    const fetcher = async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch audit logs");
        }
        return response.json();
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== "all") {
                params.append(key, value.toString());
            }
        });
        return params.toString();
    }, [filters]);

    // Fetch data from API
    const { data: apiData, error, isLoading, mutate } = useSWR<AuditLogsResponse>(
        hasPermission ? `/api/audit-logs?${queryString}` : null,
        fetcher
    );

    // Apply client-side filtering for organization search
    const data = useMemo(() => {
        if (!apiData) return apiData;

        // If no search term or search term doesn't include "dasa", return original data
        if (!filters.search || !filters.search.toLowerCase().includes("dasa")) {
            return apiData;
        }

        // Filter data to include logs where organization name contains "dasa"
        const filteredData = {
            ...apiData,
            data: apiData.data.filter(log => {
                const orgName = log.user?.organization?.[0]?.organization?.name || "";
                return orgName.toLowerCase().includes("dasa");
            })
        };

        return filteredData;
    }, [apiData, filters.search]);

    const handleFilterChange = (key: keyof typeof filters, value: string | number) => {
        console.log(`Changing filter ${key} to:`, value);
        setFilters(prev => ({
            ...prev,
            [key]: value,
            ...(key !== "page" && { page: 1 }) // Reset to page 1 when filters change
        }));
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await mutate();
            toast({
                title: "Refreshed",
                description: "Audit logs have been refreshed",
            });
        } catch (error) {
            console.error('Error refresh:', error);
            toast({
                title: "Refresh Failed",
                description: "Failed to refresh audit logs",
                variant: "destructive",
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleClearFilters = () => {
        setSearchInput(""); // Clear search input
        setFilters({
            page: 1,
            limit: 10,
            action: "all",
            userId: "",
            organizationId: "all",
            organizationName: "",
            startDate: "",
            endDate: "",
            search: "",
        });
    };

    const formatTimestamp = (timestamp: string) => {
        return format(new Date(timestamp), "MMM dd, yyyy HH:mm:ss");
    };

    const getActionBadge = (action: string, success: boolean) => {
        const config = ActionBadgeMap[action] || {
            color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
            icon: Activity
        };

        const IconComponent = config.icon;

        return (
            <Badge className={`${config.color} ${!success ? 'opacity-60' : ''} inline-flex items-center gap-1 px-2 py-1 rounded-md `}>
                <IconComponent className="h-3 w-3" />
                {action.replace(/_/g, ' ')}
                {!success && " (FAILED)"}
            </Badge>
        );
    };

    const fetchChatMessages = async (chatId: string, userId?: string) => {
        setLoadingMessages(true);
        setMessagesError(null);
        try {
            // Build URL with optional userId parameter using chat-log endpoint
            const url = userId
                ? `/api/chat-log/${chatId}?userId=${encodeURIComponent(userId)}`
                : `/api/chat-log/${chatId}`;

            console.log('Fetching chat messages:', { chatId, userId, url });
            const response = await fetch(url);
            console.log('Response status:', response.status, 'OK:', response.ok);
            if (response.ok) {
                const chatData = await response.json();
                console.log('Chat data received:', chatData);
                setChatMessages(chatData.messages || []);
                console.log('Messages set to state:', chatData.messages?.length || 0, 'messages');
                // Don't set error for empty messages, just let it show the empty state
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch chat messages:', response.status, errorText);
                setMessagesError(`Gagal memuat pesan (Error ${response.status})`);
                setChatMessages([]);
            }
        } catch (error) {
            console.error('Error fetching chat messages:', error);
            setMessagesError('Terjadi kesalahan saat memuat pesan');
            setChatMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const showLogDetails = async (log: AuditLog) => {
        setSelectedLog(log);
        setShowDetails(true);
        setChatMessages([]); // Reset messages
        setMessagesError(null); // Reset error
        setActiveTab("feedback-info"); // Reset to first tab

        // Fetch messages if this is a chat-related action and has chatId
        if ((log.action === 'CHAT_HISTORY' || log.action === 'CHAT_HISTORY_DELETED') && log.chatId) {
            // Pass userId to fetch chat from another user
            await fetchChatMessages(log.chatId, log.userId);
        }
    };

    const exportToExcel = async () => {
        try {
            // Show loading state
            const exportButton = document.querySelector('button[onClick="exportToCSV"]') as HTMLButtonElement;
            if (exportButton) {
                exportButton.disabled = true;
                exportButton.innerHTML = '<RefreshCw className="h-4 w-4 mr-2 animate-spin" />Exporting...';
            }

            // Fetch data based on current filters (search, action, dates)
            const exportParams = new URLSearchParams();

            // Include search filter if set
            if (filters.search) {
                exportParams.append('search', filters.search);
            }

            // Include action filter if set and not "all"
            if (filters.action && filters.action !== 'all') {
                exportParams.append('action', filters.action);
            }

            // Include date filters if set
            if (filters.startDate) {
                exportParams.append('startDate', filters.startDate);
            }
            if (filters.endDate) {
                exportParams.append('endDate', filters.endDate);
            }

            // Set a high limit to get all records matching the filters
            exportParams.append('limit', '1000000'); // Adjust based on your expected max records
            exportParams.append('page', '1');

            const exportUrl = `/api/audit-logs?${exportParams.toString()}`;

            toast({
                title: "Exporting...",
                description: "Fetching filtered audit logs for export",
            });

            const response = await fetch(exportUrl);
            if (!response.ok) {
                throw new Error("Failed to fetch audit logs for export");
            }

            const exportData: AuditLogsResponse = await response.json();

            if (!exportData?.data || exportData.data.length === 0) {
                toast({
                    title: "No Data",
                    description: "No audit logs available to export",
                    variant: "destructive",
                });
                return;
            }

            // Fetch chat messages for chat-related logs
            toast({
                title: "Processing...",
                description: "Fetching chat messages for export",
            });

            // Helper function to process items in batches to avoid overwhelming the server
            const processBatch = async <T, R>(
                items: T[],
                processor: (item: T) => Promise<R>,
                batchSize: number = 5,
                delayMs: number = 100
            ): Promise<R[]> => {
                const results: R[] = [];
                for (let i = 0; i < items.length; i += batchSize) {
                    const batch = items.slice(i, i + batchSize);
                    const batchResults = await Promise.all(batch.map(processor));
                    results.push(...batchResults);
                    // Add delay between batches to prevent server overload
                    if (i + batchSize < items.length) {
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                }
                return results;
            };

            // Process each log entry with batching
            const processLogEntry = async (log: AuditLog) => {
                // Clean details by removing hasComment if it's false
                let cleanedDetails = 'N/A';
                if (log.details) {
                    const detailsCopy = { ...log.details };
                    if (detailsCopy.hasComment === false) {
                        delete detailsCopy.hasComment;
                    }
                    cleanedDetails = JSON.stringify(detailsCopy);
                }

                // Fetch chat messages for CHAT_HISTORY or CHAT_HISTORY_DELETED
                let chatMessages = 'N/A';
                if ((log.action === 'CHAT_HISTORY' || log.action === 'CHAT_HISTORY_DELETED')) {
                    if (!log.chatId) {
                        // chatId is missing from the audit log record
                        chatMessages = '(Chat ID tidak tersedia)';
                    } else {
                        try {
                            // Build URL with optional userId parameter using chat-log endpoint
                            const chatUrl = log.userId
                                ? `/api/chat-log/${log.chatId}?userId=${encodeURIComponent(log.userId)}`
                                : `/api/chat-log/${log.chatId}`;
                            const chatResponse = await fetch(chatUrl);
                            if (chatResponse.ok) {
                                const chatData = await chatResponse.json();
                                if (chatData.messages && chatData.messages.length > 0) {
                                    chatMessages = chatData.messages.map((msg: any, idx: number) => {
                                        const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : msg.role;
                                        // Handle both 'content' and 'parts' message formats (AI SDK 5.0 compatibility)
                                        let content = '';
                                        if (typeof msg.content === 'string') {
                                            content = msg.content;
                                        } else if (Array.isArray(msg.content)) {
                                            content = msg.content.map((c: any) => c.text || c.content || '').join(' ');
                                        } else if (Array.isArray(msg.parts)) {
                                            // AI SDK 5.0 format: messages have 'parts' array with {type: 'text', text: '...'} objects
                                            content = msg.parts
                                                .filter((p: any) => p.type === 'text')
                                                .map((p: any) => p.text || '')
                                                .join(' ');
                                        } else if (msg.content) {
                                            content = JSON.stringify(msg.content);
                                        }
                                        // Skip empty content messages
                                        if (!content.trim()) {
                                            return `[${idx + 1}] ${role}: (konten kosong)`;
                                        }
                                        return `[${idx + 1}] ${role}: ${content}`;
                                    }).join('\n\n');
                                } else {
                                    chatMessages = '(Tidak ada pesan dalam chat)';
                                }
                            } else if (chatResponse.status === 404) {
                                chatMessages = '(Chat tidak ditemukan)';
                            } else {
                                chatMessages = `(Gagal mengambil pesan: Error ${chatResponse.status})`;
                            }
                        } catch (error) {
                            console.error(`Failed to fetch messages for chat ${log.chatId}:`, error);
                            chatMessages = '(Terjadi kesalahan saat mengambil pesan)';
                        }
                    }
                }

                return {
                    'Timestamp': formatTimestamp(log.timestamp),
                    'User Name': log.user?.name || log.userName || 'Unknown User',
                    'User Email': log.user?.email || log.userEmail || 'No email',
                    'Organization': log.user?.organization?.[0]?.organization?.name || 'No Organization',
                    'Action': log.action.replace(/_/g, ' '),
                    'Status': log.success ? 'Success' : 'Failed',
                    'Error Message': log.errorMessage || 'N/A',
                    'Details': cleanedDetails,
                    'Pesan Percakapan': chatMessages
                };
            };

            // Process logs in batches of 5 with 100ms delay between batches to prevent server overload (503 errors)
            const excelData = await processBatch(exportData.data, processLogEntry, 5, 100);

            // Create workbook and worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');

            // Auto-size columns
            const maxWidths = [
                { wch: 20 }, // Timestamp
                { wch: 25 }, // User Name
                { wch: 30 }, // User Email
                { wch: 25 }, // Organization
                { wch: 25 }, // Action
                { wch: 10 }, // Status
                { wch: 30 }, // Error Message
                { wch: 50 }, // Details
                { wch: 80 }  // Pesan Percakapan
            ];
            worksheet['!cols'] = maxWidths;

            // Generate filename with current timestamp and record count
            const now = new Date();
            const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            const filename = `audit-logs-filtered-${exportData.data.length}-records-${timestamp}.xlsx`;

            // Create and trigger download
            XLSX.writeFile(workbook, filename);

            toast({
                title: "Export Successful",
                description: `${exportData.data.length} audit logs exported as ${filename}`,
            });

        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: "Export Failed",
                description: error instanceof Error ? error.message : "Failed to export audit logs",
                variant: "destructive",
            });
        } finally {
            // Reset button state
            const exportButton = document.querySelector('button[onClick="exportToCSV"]') as HTMLButtonElement;
            if (exportButton) {
                exportButton.disabled = false;
                exportButton.innerHTML = '<Download className="h-4 w-4 mr-2" />Export';
            }
        }
    };

    // if (!hasPermission) {
    //     return (
    //         <div className="container mx-auto py-8">
    //             <Card>
    //                 <CardContent className="p-8 text-center">
    //                     <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
    //                     <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
    //                     <p className="text-muted-foreground">
    //                         You don't have permission to view audit logs. Only administrators can access this page.
    //                     </p>
    //                 </CardContent>
    //             </Card>
    //         </div>
    //     );
    // }

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor user activities and system events
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                                <p className="text-2xl font-bold">{data?.pagination.total || 0}</p>
                            </div>
                            <Activity className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Login Events</p>
                                <p className="text-2xl font-bold">
                                    {data?.data.filter(log => log.action === 'LOGIN').length || 0}
                                </p>
                            </div>
                            <Shield className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Failed Logins</p>
                                <p className="text-2xl font-bold">
                                    {data?.data.filter(log => log.action === 'LOGIN_FAILED').length || 0}
                                </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Unique Users</p>
                                <p className="text-2xl font-bold">
                                    {new Set(data?.data.map(log => log.userId).filter(Boolean)).size || 0}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="search..."
                                    className="pl-10"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            {/* Show loading indicator when debouncing */}
                            {/* {searchInput !== debouncedSearch && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Searching...
                                </div>
                            )} */}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="action">Action</Label>
                            <Select
                                value={filters.action}
                                onValueChange={(value) => handleFilterChange("action", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {actionOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                            />
                        </div>

                        <div className="flex items-end">
                            <Button
                                onClick={exportToExcel}
                                variant="outline"
                                className="w-full"
                                disabled={isLoading || !data?.data?.length}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>

                        <div className="flex items-end">
                            <Button
                                onClick={handleClearFilters}
                                variant="outline"
                                className="w-full"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Logs Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Audit Events</CardTitle>
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            size="sm"
                            disabled={isRefreshing || isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Table container with fixed height and scroll */}
                    <div className="relative border rounded-md" style={{ height: '600px' }}>
                        <div className="overflow-y-auto h-full">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-full">
                                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : error ? (
                                <div className="flex justify-center items-center h-full text-red-500">
                                    Error loading audit logs: {error.message}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.data.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {formatTimestamp(log.timestamp)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">
                                                            {log.user?.name || log.userName || "Unknown User"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {log.user?.email || log.userEmail || "No email"}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Building className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {log.user?.organization?.[0]?.organization?.name || "No Organization"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        {getActionBadge(log.action, log.success)}
                                                        {(log.action === 'CHAT_HISTORY' || log.action === 'CHAT_HISTORY_DELETED') && log.details?.topic && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {log.details.topic}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={log.success ? "default" : "destructive"}>
                                                        {log.success ? "Success" : "Failed"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => showLogDetails(log)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>

                    {/* Pagination - Always visible */}
                    {data && data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                                Showing {((filters.page - 1) * filters.limit) + 1} to{" "}
                                {Math.min(filters.page * filters.limit, data.pagination.total)} of{" "}
                                {data.pagination.total} entries
                            </div>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={filters.limit.toString()}
                                    onValueChange={(value) => handleFilterChange("limit", parseInt(value))}
                                >
                                    <SelectTrigger className="w-[120px] h-9 mr-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 / page</SelectItem>
                                        <SelectItem value="25">25 / page</SelectItem>
                                        <SelectItem value="50">50 / page</SelectItem>
                                        <SelectItem value="100">100 / page</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFilterChange("page", filters.page - 1)}
                                    disabled={filters.page <= 1 || isLoading}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <span className="text-sm">
                                    Page {filters.page} of {data.pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFilterChange("page", filters.page + 1)}
                                    disabled={filters.page >= data.pagination.totalPages || isLoading}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <DialogDescription>
                            Detailed information about this audit event
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium">Timestamp</Label>
                                    <p className="text-sm">{formatTimestamp(selectedLog.timestamp)}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Action</Label>
                                    <div className="mt-1">
                                        {getActionBadge(selectedLog.action, selectedLog.success)}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">User</Label>
                                    <p className="text-sm">
                                        {selectedLog.user?.name || selectedLog.userName || "Unknown User"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedLog.user?.email || selectedLog.userEmail || "No email"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Organization</Label>
                                    <p className="text-sm">
                                        {selectedLog.user?.organization?.[0]?.organization?.name || "No Organization"}
                                    </p>
                                </div>
                                {selectedLog.sessionId && (
                                    <div className="col-span-2">
                                        <Label className="text-sm font-medium">Session ID</Label>
                                        <p className="text-sm font-mono text-muted-foreground">
                                            {selectedLog.sessionId}
                                        </p>
                                    </div>
                                )}
                                {selectedLog.errorMessage && (
                                    <div className="col-span-2">
                                        <Label className="text-sm font-medium">Error Message</Label>
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {selectedLog.errorMessage}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Chat-specific information */}
                            {selectedLog.details && (selectedLog.action === 'CHAT_HISTORY' || selectedLog.action === 'CHAT_HISTORY_DELETED') && (
                                <div>
                                    <Separator />
                                    <div className="mt-4">
                                        <Label className="text-sm font-medium">Informasi Riwayat Percakapan</Label>
                                        <div className="mt-2 p-3 bg-muted rounded-md space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedLog.details.topic && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Topik</p>
                                                        <p className="text-sm">{selectedLog.details.topic}</p>
                                                    </div>
                                                )}
                                                {selectedLog.details.agentName && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Nama Agent</p>
                                                        <p className="text-sm">{selectedLog.details.agentName}</p>
                                                    </div>
                                                )}
                                                {selectedLog.details.messageCount !== undefined && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Jumlah Pesan</p>
                                                        <p className="text-sm">{selectedLog.details.messageCount}</p>
                                                    </div>
                                                )}
                                                {selectedLog.details.totalTokens !== undefined && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Total Token</p>
                                                        <p className="text-sm">{selectedLog.details.totalTokens.toLocaleString()}</p>
                                                    </div>
                                                )}
                                                {selectedLog.details.promptTokens !== undefined && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Prompt Token</p>
                                                        <p className="text-sm">{selectedLog.details.promptTokens.toLocaleString()}</p>
                                                    </div>
                                                )}
                                                {selectedLog.details.completionTokens !== undefined && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Completion Token</p>
                                                        <p className="text-sm">{selectedLog.details.completionTokens.toLocaleString()}</p>
                                                    </div>
                                                )}
                                                {selectedLog.details.responseTime !== undefined && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Waktu Respon</p>
                                                        <p className="text-sm">{(selectedLog.details.responseTime / 1000).toFixed(2)}s</p>
                                                    </div>
                                                )}
                                                {selectedLog.details.timestamp && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Waktu Percakapan</p>
                                                        <p className="text-sm">{new Date(selectedLog.details.timestamp).toLocaleString()}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Messages Section */}
                                        <div className="mt-4">
                                            <Label className="text-sm font-medium mb-2 block">Pesan Percakapan</Label>
                                            <div className="border rounded-md bg-background">
                                                {loadingMessages ? (
                                                    <div className="flex justify-center items-center p-8">
                                                        <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                                                        <span className="ml-2 text-sm text-muted-foreground">Memuat pesan...</span>
                                                    </div>
                                                ) : chatMessages.length > 0 ? (
                                                    <ScrollArea className="h-[400px] p-4">
                                                        <div className="space-y-4">
                                                            {chatMessages.map((message: any, index: number) => {
                                                                const isUser = message.role === 'user';
                                                                const isAssistant = message.role === 'assistant';

                                                                return (
                                                                    <div
                                                                        key={index}
                                                                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                                                    >
                                                                        <div
                                                                            className={`max-w-[80%] rounded-lg p-3 ${isUser
                                                                                ? 'bg-blue-800 text-white'
                                                                                : 'bg-gray-200 dark:bg-zinc-800 dark:text-white'}`}
                                                                        >
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="text-xs font-semibold">
                                                                                    {isUser ? 'User' : isAssistant ? 'Assistant' : message.role}
                                                                                </span>
                                                                                <span className={`text-xs ${isUser ? 'text-white opacity-70' : 'opacity-70'}`}>
                                                                                    #{index + 1}
                                                                                </span>
                                                                            </div>
                                                                            <div className={`text-sm prose prose-sm max-w-none ${isUser ? 'prose-invert text-white' : 'dark:prose-invert'}`}>
                                                                                <ReactMarkdown
                                                                                    remarkPlugins={[remarkGfm]}
                                                                                    components={{
                                                                                        // Override styles for better chat bubble appearance
                                                                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                                                        ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4">{children}</ul>,
                                                                                        ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4">{children}</ol>,
                                                                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                                                                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                                                        h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                                                                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                                                                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                                                        code: ({ children }) => <code className={`${isUser ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'} px-1 py-0.5 rounded text-xs`}>{children}</code>,
                                                                                        pre: ({ children }) => <pre className={`${isUser ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'} p-2 rounded text-xs overflow-x-auto my-2`}>{children}</pre>,
                                                                                    }}
                                                                                >
                                                                                    {preprocessMarkdownUrls(
                                                                                        typeof message.content === 'string'
                                                                                            ? message.content
                                                                                            : Array.isArray(message.content)
                                                                                                ? message.content.map((c: any) => c.text || c.content || '').join(' ')
                                                                                                : Array.isArray(message.parts)
                                                                                                    ? message.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(' ')
                                                                                                    : message.content ? JSON.stringify(message.content) : ''
                                                                                    )}
                                                                                </ReactMarkdown>
                                                                            </div>
                                                                            {message.toolInvocations && message.toolInvocations.length > 0 && (
                                                                                <div className="mt-2 pt-2 border-t border-border/50">
                                                                                    <p className="text-xs font-semibold mb-1">Tool Calls:</p>
                                                                                    <div className="space-y-1">
                                                                                        {message.toolInvocations.map((tool: any, toolIndex: number) => (
                                                                                            <div key={toolIndex} className="text-xs opacity-80">
                                                                                                • {tool.toolName}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </ScrollArea>
                                                ) : (
                                                    <div className="flex justify-center items-center p-8 text-muted-foreground">
                                                        <p className="text-sm">Tidak ada pesan yang tersedia</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Message feedback information */}
                            {selectedLog.details && selectedLog.action === 'MESSAGE_FEEDBACK_GIVEN' && (
                                <div>
                                    <Separator />
                                    <div className="mt-4">
                                        <Tabs
                                            value={activeTab}
                                            onValueChange={(value) => {
                                                console.log('Tab changed to:', value);
                                                console.log('Current state:', {
                                                    chatId: selectedLog.chatId,
                                                    messagesCount: chatMessages.length,
                                                    loadingMessages
                                                });
                                                setActiveTab(value);
                                                // Fetch messages when switching to chat-messages tab
                                                if (value === "chat-messages" && selectedLog.chatId && chatMessages.length === 0 && !loadingMessages) {
                                                    console.log('Triggering fetch for chat messages');
                                                    fetchChatMessages(selectedLog.chatId, selectedLog.userId);
                                                }
                                            }}
                                            className="w-full"
                                        >
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="feedback-info">Detail Reaksi</TabsTrigger>
                                                <TabsTrigger value="chat-messages">
                                                    Detail Percakapan
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="feedback-info">
                                                <div className="mt-2 p-3 bg-muted rounded-md space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {selectedLog.details.feedbackType && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">Tipe Reaksi</p>
                                                                <p className="text-sm capitalize flex items-center gap-2">
                                                                    {selectedLog.details.feedbackType === 'like' ? '👍 Like' : '👎 Dislike'}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selectedLog.details.messageRole && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">Peran Pesan</p>
                                                                <p className="text-sm capitalize">{selectedLog.details.messageRole}</p>
                                                            </div>
                                                        )}
                                                        {selectedLog.details.messageIndex !== undefined && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">Urutan Pesan</p>
                                                                <p className="text-sm">{selectedLog.details.messageIndex}</p>
                                                            </div>
                                                        )}
                                                        {/* {selectedLog.details.feedbackId && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">ID Feedback</p>
                                                                <p className="text-sm font-mono text-muted-foreground">{selectedLog.details.feedbackId}</p>
                                                            </div>
                                                        )} */}
                                                        {selectedLog.details.previousMessageContent && (
                                                            <div className="col-span-2">
                                                                <p className="text-xs font-medium text-muted-foreground">Pertanyaan Pengguna</p>
                                                                <p className="text-sm bg-muted/50 p-2 rounded mt-1 whitespace-pre-wrap break-words">
                                                                    {selectedLog.details.previousMessageContent}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selectedLog.details.messageContent && (
                                                            <div className="col-span-2">
                                                                <p className="text-xs font-medium text-muted-foreground">
                                                                    {selectedLog.details.messageRole === 'assistant' ? 'Jawaban AI' : 'Pesan Pengguna'}
                                                                </p>
                                                                <div className="bg-muted/50 p-2 rounded mt-1">
                                                                    <div className={`text-sm prose prose-sm max-w-none ${selectedLog.details.messageRole === 'user' ? 'prose-invert text-white' : 'dark:prose-invert'}`}>
                                                                        <ReactMarkdown
                                                                            remarkPlugins={[remarkGfm]}
                                                                            components={{
                                                                                // Override styles for better chat bubble appearance
                                                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                                                ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4">{children}</ul>,
                                                                                ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4">{children}</ol>,
                                                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                                                h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                                                                h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                                                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                                                code: ({ children }) => <code className={`${selectedLog.details.messageRole === 'user' ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'} px-1 py-0.5 rounded text-xs`}>{children}</code>,
                                                                                pre: ({ children }) => <pre className={`${selectedLog.details.messageRole === 'user' ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'} p-2 rounded text-xs overflow-x-auto my-2`}>{children}</pre>,
                                                                            }}
                                                                        >
                                                                            {preprocessMarkdownUrls(
                                                                                typeof selectedLog.details.messageContent === 'string'
                                                                                    ? selectedLog.details.messageContent
                                                                                    : Array.isArray(selectedLog.details.messageContent)
                                                                                        ? selectedLog.details.messageContent.map((c: any) => c.text || c.content || '').join(' ')
                                                                                        : selectedLog.details.messageContent ? JSON.stringify(selectedLog.details.messageContent) : ''
                                                                            )}
                                                                        </ReactMarkdown>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="chat-messages">
                                                {selectedLog.chatId ? (
                                                    <div className="border rounded-md bg-background">
                                                        {loadingMessages ? (
                                                            <div className="flex flex-col justify-center items-center p-8">
                                                                <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                                                                <span className="mt-2 text-sm text-muted-foreground">Memuat pesan...</span>
                                                            </div>
                                                        ) : messagesError ? (
                                                            <div className="flex flex-col justify-center items-center p-8 text-muted-foreground">
                                                                <p className="text-sm mb-4">{messagesError}</p>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => fetchChatMessages(selectedLog.chatId!, selectedLog.userId)}
                                                                >
                                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                                    Coba Lagi
                                                                </Button>
                                                            </div>
                                                        ) : chatMessages.length > 0 ? (
                                                            <ScrollArea className="h-[400px] p-4">
                                                                <div className="space-y-6 mx-2 my-4">
                                                                    {chatMessages.map((message: any, index: number) => {
                                                                        const isUser = message.role === 'user';
                                                                        const isAssistant = message.role === 'assistant';

                                                                        // Get message content for comparison
                                                                        const messageContent = typeof message.content === 'string'
                                                                            ? message.content
                                                                            : Array.isArray(message.content)
                                                                                ? message.content.map((c: any) => c.text || c.content || '').join(' ')
                                                                                : JSON.stringify(message.content);

                                                                        // Check if this is the feedback message by comparing content
                                                                        const isFeedbackMessage = selectedLog.details?.messageContent &&
                                                                            messageContent === (
                                                                                typeof selectedLog.details.messageContent === 'string'
                                                                                    ? selectedLog.details.messageContent
                                                                                    : Array.isArray(selectedLog.details.messageContent)
                                                                                        ? selectedLog.details.messageContent.map((c: any) => c.text || c.content || '').join(' ')
                                                                                        : JSON.stringify(selectedLog.details.messageContent)
                                                                            );

                                                                        // Check if this is the previous message (question before the feedback)
                                                                        const isPreviousMessage = selectedLog.details?.previousMessageContent &&
                                                                            messageContent === selectedLog.details.previousMessageContent;

                                                                        return (
                                                                            <div
                                                                                key={index}
                                                                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                                                            >
                                                                                <div
                                                                                    className={`max-w-[80%] rounded-lg p-3 ${isUser
                                                                                        ? 'bg-blue-800 text-white'
                                                                                        : 'bg-gray-200 dark:bg-zinc-800 dark:text-white'
                                                                                        } ${isFeedbackMessage ? 'ring-2 ring-yellow-500 ring-offset-2 shadow-lg' : ''} ${isPreviousMessage ? 'ring-2 ring-blue-400 ring-offset-2 shadow-md' : ''}`}
                                                                                >
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <span className="text-xs font-semibold">
                                                                                            {isUser ? 'User' : isAssistant ? 'Assistant' : message.role}
                                                                                        </span>
                                                                                        <span className={`text-xs ${isUser ? 'text-white opacity-70' : 'opacity-70'}`}>
                                                                                            #{index + 1}
                                                                                        </span>
                                                                                        {isFeedbackMessage && (
                                                                                            <span className="text-xs font-semibold bg-yellow-500 text-black px-2 py-0.5 rounded">
                                                                                                {selectedLog.details?.feedbackType === 'like' ? '👍 Like' : '👎 Dislike'}
                                                                                            </span>
                                                                                        )}
                                                                                        {isPreviousMessage && (
                                                                                            <span className="text-xs font-semibold bg-blue-400 text-white px-2 py-0.5 rounded">
                                                                                                Pertanyaan
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className={`text-sm prose prose-sm max-w-none ${isUser ? 'prose-invert text-white' : 'dark:prose-invert'}`}>
                                                                                        <ReactMarkdown
                                                                                            remarkPlugins={[remarkGfm]}
                                                                                            components={{
                                                                                                // Override styles for better chat bubble appearance
                                                                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                                                                ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4">{children}</ul>,
                                                                                                ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4">{children}</ol>,
                                                                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                                                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                                                                h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                                                                                h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                                                                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                                                                code: ({ children }) => <code className={`${isUser ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'} px-1 py-0.5 rounded text-xs`}>{children}</code>,
                                                                                                pre: ({ children }) => <pre className={`${isUser ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'} p-2 rounded text-xs overflow-x-auto my-2`}>{children}</pre>,
                                                                                            }}
                                                                                        >
                                                                                            {preprocessMarkdownUrls(
                                                                                                typeof message.content === 'string'
                                                                                                    ? message.content
                                                                                                    : Array.isArray(message.content)
                                                                                                        ? message.content.map((c: any) => c.text || c.content || '').join(' ')
                                                                                                        : Array.isArray(message.parts)
                                                                                                            ? message.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(' ')
                                                                                                            : message.content ? JSON.stringify(message.content) : ''
                                                                                            )}
                                                                                        </ReactMarkdown>
                                                                                    </div>
                                                                                    {message.toolInvocations && message.toolInvocations.length > 0 && (
                                                                                        <div className="mt-2 pt-2 border-t border-border/50">
                                                                                            <p className="text-xs font-semibold mb-1">Tool Calls:</p>
                                                                                            <div className="space-y-1">
                                                                                                {message.toolInvocations.map((tool: any, toolIndex: number) => (
                                                                                                    <div key={toolIndex} className="text-xs opacity-80">
                                                                                                        • {tool.toolName}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </ScrollArea>
                                                        ) : (
                                                            <div className="flex justify-center items-center p-8 text-muted-foreground">
                                                                <p className="text-sm">Tidak ada pesan yang tersedia</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center items-center p-8 text-muted-foreground">
                                                        <p className="text-sm">Tidak ada chat ID tersedia</p>
                                                    </div>
                                                )}
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </div>
                            )}

                            {selectedLog.details && selectedLog.action !== 'CHAT_HISTORY' && selectedLog.action !== 'CHAT_HISTORY_DELETED' && selectedLog.action !== 'MESSAGE_FEEDBACK_GIVEN' && (
                                <div>
                                    <Separator />
                                    <div className="mt-4">
                                        <Label className="text-sm font-medium">Additional Details</Label>
                                        <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                                            {JSON.stringify(selectedLog.details, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};