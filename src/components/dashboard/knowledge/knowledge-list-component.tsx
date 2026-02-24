"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToastProvider } from "@/components/ui/toast";
import { useStore } from "@/stores/knowledge-new/useStore";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Data } from "@/stores/knowledge-new/model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { KnowledgeTable } from "./knowledge-table";
import { getSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Plus,
  Search,
  AlertCircle,
  Database,
  PenSquare,
  Trash2,
  FileText,
  Wrench,
  Bot,
  RefreshCw,
} from "lucide-react";
import { useStore as useAgentStore } from "@/stores/agent/useStore";
import { Data as AgentData } from "@/stores/agent/model";
import { usePaginationTable } from "@/hooks/use-pagination-table";
import TableSkeleton from "@/components/skeleton/table";
import { SmartLoadingWrapper } from "@/components/ui/loading-skeletons/smart-loading-wrapper";
import { Skeleton } from "@/components/ui/loading-skeletons/skeleton-base";

import { useAuthStore } from "@/utils/auth-utils-client";
import { CheckCRUDPermission } from "@/utils/access-check";
import { Shield, Lock } from "lucide-react";

export const KnowledgeListComponent = () => {
  const router = useRouter();
  const { session } = useAuthStore();
  const MENU_CONST = "MANAGE_KNOWLEDGE";

  // Permission checks
  const hasAccess = CheckCRUDPermission(session, MENU_CONST, "read");
  const canCreate = CheckCRUDPermission(session, MENU_CONST, "create");
  const canEdit = CheckCRUDPermission(session, MENU_CONST, "update");
  const canDelete = CheckCRUDPermission(session, MENU_CONST, "delete");
  const canView = CheckCRUDPermission(session, MENU_CONST, "read");

  const hasValidAccess = hasAccess && canView;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    getList,
    error,
    loading,
    data,
    delete: deleteTool,
    count,
  } = useStore();
  const { getList: getAgentList, data: agentData } = useAgentStore();
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Data | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string[]>([]);
  const [openAssignedAgent, setOpenAssignedAgent] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pagination = usePaginationTable({ totalItems: count || 0 });

  // Load knowledge list
  const fetchData = useCallback(async () => {
    await getList({
      offset: pagination.currentPage,
      limit: pagination.pageSize,
    });
  }, [pagination.currentPage, pagination.pageSize]);

  const filteredAgentData = useMemo(() => {
    if (!agentData) return [];

    return agentData.filter((agent) =>
      selectedAgent.includes(agent.id as string)
    );
  }, [agentData, selectedAgent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (error) {
      setIsError(true);
    }
    return () => {
      setIsError(false);
    };
  }, [error]);

  useEffect(() => {
    if (loading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    setTools(data);
    return () => { };
  }, [data]);

  // Permission check - Start countdown if no access
  useEffect(() => {
    if (!hasValidAccess && countdown === null && !isRedirecting) {
      setCountdown(5);
      setIsRedirecting(true);
    }
  }, [hasValidAccess, countdown, isRedirecting]);

  // Permission check - Countdown and redirect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (!hasValidAccess && countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            // Redirect when countdown reaches 0
            router.push("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup timer
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [hasValidAccess, countdown, router]);

  useEffect(() => {
    connectWebsocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const connectWebsocket = async () => {
    try {
      const auth = await getSession();
      if (!auth?.user.id || !process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
        console.error("Missing user ID or websocket URL");
        return;
      }

      ws.current = new WebSocket(
        `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/notification/embedding/${auth?.user.id}`
      );

      ws.current.onopen = () => {
        ws.current?.send(
          JSON.stringify({
            action: "listen",
            channel: "embedding",
            message: "Hi, it's connected",
          })
        );
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (
          data.action === "receive_notification" &&
          data.channel === "embedding"
        ) {
          const message = data.message;
          toast({
            title: "Update on knowledge",
            description: message,
          });

          // Add a small delay before reloading to ensure backend processing is complete
          setTimeout(() => {
            // Use fetchData instead of getList with potentially undefined parameters
            fetchData();
          }, 500);
        }
      };

      ws.current.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      ws.current.onclose = () => {
        console.log("Disconnected");
      };
    } catch (error) {
      console.error("Error connecting to websocket:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter knowledge based on search query
  const filteredTools = searchQuery
    ? tools?.filter(
      (tool) =>
        tool.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.type?.valueString
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
    )
    : tools;

  const onView = async (data: any) => {
    setSelectedTool(data);
    setIsViewOpen(true);
  };

  const onEdit = async (data: any) => {
    router.push(`/knowledge/edit/${data.id}`);
  };

  const onDelete = async (data: any) => {
    setIsDeleteOpen(true);
    setSelectedTool(data);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTool?.id) {
      toast({
        title: "Delete Failed",
        description: "No tool selected for deletion",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // ✅ Handle void return type from deleteTool
      await deleteTool(selectedTool.id);

      // ✅ If we reach here, deletion was successful (no exception thrown)
      toast({
        title: "Delete Successful",
        description: `"${selectedTool.name}" has been deleted successfully`,
      });

      setIsDeleteOpen(false);
      setSelectedTool(null);
      await fetchData();
    } catch (error: any) {
      // ✅ Enhanced error handling for different error types
      let errorMessage = "An unexpected error occurred";
      let errorTitle = "Delete Failed";

      // Handle HTTP response errors
      if (error?.response?.data) {
        const errorData = error.response.data;

        if (errorData.response_message) {
          errorMessage = errorData.response_message;
        }

        // Handle specific HTTP status codes
        if (error.response.status === 409) {
          errorTitle = "Cannot Delete";
          errorMessage =
            errorData.response_message ||
            "This tool has dependencies that must be removed first";
        } else if (error.response.status === 500) {
          errorMessage =
            errorData.response_message ||
            "Server error occurred. Please try again later.";
        }

        // Handle specific constraint errors
        if (errorData.data?.error_type === "foreign_key_constraint") {
          errorTitle = "Cannot Delete";
          errorMessage =
            "This tool has active schedule jobs. Please delete or reassign them first.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      toast({
        title: "Refreshed Successfully",
        description: "Knowledge list has been updated.",
      });
    } catch (error: any) {
      console.log("error", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh knowledge list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  const onOpenAssignedAgent = async () => {
    await getAgentList({ offset: 1, limit: 1000 });
    setOpenAssignedAgent(true);
  };

  const methodColors = {
    GET: "text-green-500",
    POST: "text-blue-500",
    PUT: "text-yellow-500",
    DELETE: "text-red-500",
    PATCH: "text-purple-500",
  };

  // Enhanced access control check
  if (!hasValidAccess) {
    return (
      <ToastProvider>
        <Card className="w-full mt-6 shadow-sm">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Access Restricted
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  You don&apos;t have the necessary permissions to view
                  Knowledge Management. Please contact your administrator if you
                  believe this is an error.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Lock className="w-4 h-4" />
                <span>Required permission: Read Access</span>
              </div>
              {countdown !== null && countdown >= 0 && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 animate-in fade-in duration-300">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <p className="text-blue-800 dark:text-blue-200 font-medium">
                        Redirecting to dashboard in
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-105">
                      {countdown}
                    </span>
                    <span className="text-blue-800 dark:text-blue-200 font-medium">
                      second{countdown !== 1 ? "s" : ""}...
                    </span>
                  </div>
                  {countdown === 0 && (
                    <div className="mt-2 text-center">
                      <div className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Redirecting...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Card className="w-full mt-6 shadow-sm rounded-lg border">
        <CardHeader className="border-b rounded-t-lg bg-gray-50 dark:bg-zinc-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Knowledge Management
              </h1>
              <CardDescription>
                Manage your external knowledge sources for AI agents
              </CardDescription>
            </div>
            {canCreate && (
              <Button asChild className="flex items-center gap-2">
                <Link href="/knowledge/new">
                  <Plus className="h-4 w-4" />
                  <span>Add Knowledge</span>
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                There was an error loading your knowledge sources. Please try
                again.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search knowledge..."
                  className="pl-10"
                  aria-label="Search Knowledge by Name"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 flex-shrink-0 rounded-lg"
                title="Refresh knowledge list"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredTools?.length || 0} Knowledge Sources
              </Badge>
            </div>
          </div>

          <div className="mt-4">
            <SmartLoadingWrapper
              isLoading={isLoading && !filteredTools?.length}
              fallback={<TableSkeleton columnDefs={Array.from({ length: 9 })} />}
            >
              <KnowledgeTable
                data={filteredTools || []}
                loading={isLoading}
                viewAction={onView}
                editAction={onEdit}
                deleteAction={onDelete}
                openAssignedAgent={onOpenAssignedAgent}
                setSelectedAgent={setSelectedAgent}
                totalItems={count || 0}
                pagination={pagination}
                canEdit={canEdit}
                canDelete={canDelete}
                canView={canView}
              />
            </SmartLoadingWrapper>
          </div>

        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Database className="h-5 w-5" />
              Knowledge Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this knowledge source
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow overflow-y-auto my-2">
            <div className="space-y-6 pr-4">
              {selectedTool && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        {selectedTool.name || "N/A"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Documents: {selectedTool.functionName || "N/A"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        selectedTool.syncStatus === "COMPLETED"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {selectedTool.syncStatus === "COMPLETED"
                        ? "Completed"
                        : "In Progress"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Agent
                    </h4>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                      {selectedTool.agent?.agentName || "N/A"}
                    </div>
                  </div>

                  {selectedTool.systemInstruction && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        System Instruction
                      </h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                        <pre className="whitespace-pre-wrap">
                          {selectedTool.systemInstruction}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedTool.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Description
                      </h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                        <pre className="whitespace-pre-wrap">
                          {selectedTool.description}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Type
                    </h4>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                      {selectedTool.type?.valueString || "N/A"}
                    </div>
                  </div>

                  {selectedTool.type?.valueString === "REST API" && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        API URL
                      </h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                        <div className="flex gap-8">
                          <span
                            className={`w-2 h-2 rounded-full font-bold ${methodColors[
                              selectedTool.requestMethod as keyof typeof methodColors
                              ]
                              }`}
                          >
                            {selectedTool.requestMethod?.toUpperCase() || "N/A"}
                          </span>

                          <span>{selectedTool.requestUrl || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTool.documents &&
                    selectedTool.documents.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Documents
                        </h4>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                          <ul className="space-y-2">
                            {selectedTool.documents?.map(
                              (doc: any, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  <Link
                                    href={`/api/document/${doc.bucketName}`}
                                    target="_blank"
                                    className="text-blue-500 hover:text-blue-600"
                                  >
                                    {doc.bucketName.includes("-")
                                      ? doc.bucketName
                                        .split("-")
                                        .slice(2)
                                        .join("-")
                                      : doc.bucketName}
                                  </Link>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                  {selectedTool.sqlCommand !== "" && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        SQL Query
                      </h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                        <pre className="whitespace-pre-wrap">
                          {selectedTool.sqlCommand}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Created At
                    </h4>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                      {selectedTool.createdAt
                        ? new Date(selectedTool.createdAt).toLocaleString()
                        : "N/A"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </h4>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                      {selectedTool.updatedAt
                        ? new Date(selectedTool.updatedAt).toLocaleString()
                        : "N/A"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewOpen(false);
                onEdit(selectedTool);
              }}
              disabled={selectedTool?.userId !== session?.user?.id}
            >
              <PenSquare className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Knowledge
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this knowledge source? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 text-sm">
            <p className="font-medium">{selectedTool?.name}</p>
            <p className="text-muted-foreground mt-1">
              Type: {selectedTool?.type?.valueString}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isLoading || !selectedTool?.id}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Assigned Agent */}
      <Dialog open={openAssignedAgent} onOpenChange={setOpenAssignedAgent}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
              Assigned Agent
            </DialogTitle>
            <DialogDescription>
              {filteredAgentData.length} agent
              {filteredAgentData.length !== 1 ? "s" : ""} assigned to this
              knowledge.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto pr-2 mt-2">
            {filteredAgentData.length > 0 ? (
              <div className="space-y-3">
                {filteredAgentData.map((ua: AgentData, index: number) => (
                  <div
                    key={ua.id || `agent-${index}`}
                    className="flex items-center p-4 border rounded-md hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 shrink-0">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-medium text-base">
                        {ua?.agentName || "Unknown Agent"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {ua?.description || "No description available"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* {ua.agent?.tags &&
                          Array.isArray(ua.agent.tags) &&
                          ua.agent.tags.map(
                            (tag: string, tagIndex: number) => (
                              <Badge
                                key={tagIndex}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            )
                          )} */}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-600 ml-2 shrink-0"
                    >
                      Agent
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4 text-gray-300"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
                <p className="text-lg font-medium">No agents assigned</p>
                <p className="text-sm">
                  This user doesn&apos;t have any agent assignments.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setOpenAssignedAgent(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToastProvider>
  );
};
