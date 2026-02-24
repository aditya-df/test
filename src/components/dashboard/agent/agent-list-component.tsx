/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Dialog,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStore } from "@/stores/agent/useStore";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AgentTable } from "./agent-table";
import { useAgentForm } from "@/hooks/agent/use-agent-form";
import { Data } from "@/stores/agent/model";
import { ToastProvider } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading-skeletons/skeleton-base";
import { SmartLoadingWrapper } from "@/components/ui/loading-skeletons/smart-loading-wrapper";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Plus,
  AlertCircle,
  Save,
  Search,
  Bot,
  PenSquare,
  Loader2,
  WandSparkles,
  CheckCircle,
  Cpu,
  User,
  Sparkles,
  Brain,
  RefreshCw,
} from "lucide-react";
import { useStore as useKnowledgeStore } from "@/stores/knowledge-new/useStore";
import { Data as KnowledgeData } from "@/stores/knowledge-new/model";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AVATAR_OPTIONS, AvatarSelection } from "./agent-avatar";
import { useAuthStore } from "@/utils/auth-utils-client";
import { ProcessName, VisibilityType } from "@prisma/client";
import { useRouter } from "next/navigation";
import useApprovalProcess from "@/hooks/approval/use-approval-process";
import { useStore as useApprovalStore } from "@/stores/approval/useStore";
import { usePaginationTable } from "@/hooks/use-pagination-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Data as ApprovalRequestData } from "@/stores/approval/model";
import { ApprovalStatusBadge } from "@/components/ui/status-badge";
import { ApprovalStatus } from "@prisma/client";
import TableSkeleton from "@/components/skeleton/table";
import { CheckCRUDPermission } from "@/utils/access-check";
import { Shield, Lock } from "lucide-react";

export const AgentContent = () => {
  const { session } = useAuthStore();
  const router = useRouter();
  const MENU_CONST = "MANAGE_AGENTS";

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
    count,
    create,
    update,
    makeCustomEndpointRequest,
    customData: unassignedAgents,
    regenerateToken,
  } = useStore();
  const {
    makeCustomEndpointRequest: getCountOutstandingApproval,
    customData: countOutstandingApproval,
    getList: getApprovalRequest,
    data: approvalRequestData,
  } = useApprovalStore();
  const { getList: getListKnowledge, data: knowledgeData } =
    useKnowledgeStore();
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [agent, setAgent] = useState<Data | null>(null);
  const [isOpenDetail, setIsOpenDetail] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeData[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [knowledgeSearchTerm, setKnowledgeSearchTerm] = useState("");
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const [isOpenKnowledge, setIsOpenKnowledge] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    AVATAR_OPTIONS[0].id
  );
  const [isOpenUnassignedAgents, setIsOpenUnassignedAgents] = useState(false);
  const [requestedAgents, setRequestedAgents] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unassignedAgentSearchTerm, setUnassignedAgentSearchTerm] =
    useState("");
  const [isRequestAccessLoading, setIsRequestAccessLoading] = useState(false);
  const pagination = usePaginationTable({ totalItems: count || 0 });
  const [activeTab, setActiveTab] = useState("available");
  const userRoles = session?.user?.roles || [];
  const isCommonUser = Array.isArray(userRoles)
    ? userRoles.includes("user")
    : userRoles === "user";
  const userId = session?.user.id;

  const {
    handleInputChange,
    handleTemperatureChange,
    handleSave,
    handleEdit,
    payload,
    setPayload,
    handleGenerateDescription,
    handleDescribeChange,
    buttonActive,
    isLoading: isLoadingAgent,
    setIsLoading: setIsLoadingAgent,
  } = useAgentForm(create, setIsOpen, update, setIsOpenEdit);

  const { handleSubmitRequestApproval } = useApprovalProcess();

  const fetchData = useCallback(async () => {
    if (session?.user?.backendToken) {
      await getList({
        offset: pagination.currentPage,
        limit: pagination.pageSize,
      });
    }
  }, [getList, pagination.currentPage, pagination.pageSize, session]);

  const fetchCountOutstandingApproval = useCallback(async () => {
    if (!session?.user?.roles?.includes("admin")) {
      return;
    }

    try {
      await getCountOutstandingApproval?.({
        path: "count/outstanding",
        method: "GET",
        queryParams: {
          process_name: ProcessName.APPROVAL_AGENT_ACCESS,
        },
      });
    } catch (error) {
      console.error("Error fetching outstanding approvals:", error);
    }
  }, [getCountOutstandingApproval, session?.user?.roles]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch outstanding approvals
  useEffect(() => {
    if (session?.user?.roles?.includes("admin")) {
      fetchCountOutstandingApproval();
    }
  }, [session, fetchCountOutstandingApproval]);

  // Simplify error handling
  useEffect(() => {
    setIsError(!!error);
  }, [error]);

  // Simplify loading state
  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

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

  const onView = useCallback((data: any) => {
    setAgent(data);
    setIsOpenDetail(true);
  }, []);

  const onEdit = useCallback(
    async (data: any) => {
      await getListKnowledge({ offset: 1, limit: 9999 });
      setKnowledge(knowledgeData);
      setPayload(data);
      // Set initial selected knowledge from toolsOnAgent
      if (data.toolsOnAgent && Array.isArray(data.toolsOnAgent)) {
        const initialSelectedKnowledge = data.toolsOnAgent.map(
          (tool: any) => tool.functionToolId
        );
        setSelectedKnowledge(initialSelectedKnowledge);
      } else {
        setSelectedKnowledge([]);
      }

      if (data.image) {
        setSelectedAvatar(data.image);
      } else {
        setSelectedAvatar(AVATAR_OPTIONS[0].id);
      }

      setIsOpenEdit(true);
    },
    [setPayload]
  );

  const handleGenerateAIInstruction = () => {
    // If there's existing content, show confirmation dialog
    if (payload?.systemInstruction?.trim() || payload?.description?.trim()) {
      setShowConfirmGenerate(true);
    } else {
      // If no content, generate directly
      generateInstructions();
    }
  };

  const generateInstructions = async () => {
    try {
      // Show loading state
      setIsLoadingAgent(true);

      // Call the handleGenerateDescription function
      await handleGenerateDescription().then((data) => {
        if (data) {
          // Update both fields with the response data
          setPayload({
            ...payload,
            systemInstruction: data.system_instructions || "",
            description: data.tool_description || "",
          });

          // Show success toast
          toast({
            title: "AI Instructions Generated",
            description:
              "System instructions and description have been updated.",
          });
        }
      });
    } catch (error) {
      console.error("Error generating description:", error);
      // Show error toast
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI instructions. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Hide loading state
      setIsLoadingAgent(false);
      setShowConfirmGenerate(false);
    }
  };

  // Filter agents based on search query - memoized to prevent re-renders
  const filteredAgents = useMemo(() => {
    return searchQuery
      ? data?.filter(
        (agent) =>
          agent.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      : data;
  }, [data, searchQuery]);

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeData) return [];

    return knowledgeData.filter(
      (knowledge) =>
        (knowledge &&
          knowledge.name
            ?.toLowerCase()
            .includes(knowledgeSearchTerm.toLowerCase())) ||
        (knowledge &&
          knowledge.description &&
          knowledge.description
            .toLowerCase()
            .includes(knowledgeSearchTerm.toLowerCase()))
    );
  }, [knowledgeData, knowledgeSearchTerm]);

  const filterSelectedKnowledge = useMemo(() => {
    if (!knowledgeData) return [];

    return knowledgeData.filter((knowledge) =>
      selectedKnowledge.includes(knowledge.id as string)
    );
  }, [selectedKnowledge, knowledgeData]);

  const filteredUnassignedAgents = useMemo(() => {
    if (!unassignedAgents) return [];
    return unassignedAgents.filter(
      (agent: any) =>
        agent.agentName
          .toLowerCase()
          .includes(unassignedAgentSearchTerm.toLowerCase()) ||
        agent.description
          ?.toLowerCase()
          .includes(unassignedAgentSearchTerm.toLowerCase())
    );
  }, [unassignedAgents, unassignedAgentSearchTerm]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      toast({
        title: "Refreshed Successfully",
        description: "Agent list has been updated.",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh agent list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  const openCreateAgent = async () => {
    // Reset all form states to initial/empty values
    setPayload({
      agentName: "",
      systemInstruction: "",
      description: "",
      visibilityType: undefined,
      toolsIds: [],
      image: AVATAR_OPTIONS[0].id,
    });

    // Reset selected knowledge
    setSelectedKnowledge([]);

    // Reset selected avatar to default
    setSelectedAvatar(AVATAR_OPTIONS[0].id);

    // Load knowledge data
    await getListKnowledge({ offset: 1, limit: 9999 });
    setKnowledge(knowledgeData);

    // Open the dialog
    setIsOpen(true);
  };

  const onSave = async () => {
    payload.toolsIds = selectedKnowledge;
    payload.image = selectedAvatar;

    try {
      const success = await handleSave();

      if (!success) {
        return;
      }

      // Refresh the main agent list
      await fetchData();

      // Notify the menu to refresh its agent list
      window.dispatchEvent(new CustomEvent("agentCreated"));

      toast({
        title: "Agent Created",
        description:
          "Your agent has been created successfully and is now available in the menu.",
      });
    } catch (error) {
      console.error("Error creating agent:", error);
      toast({
        title: "Error",
        description: "Failed to create agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onOpenDialogKnowledge = async () => {
    await getListKnowledge({ offset: 1, limit: 9999 });
    setKnowledge(knowledgeData);
    setIsOpenKnowledge(true);
  };

  const onSubmitEdit = async () => {
    payload.toolsIds = selectedKnowledge;
    payload.image = selectedAvatar;
    delete payload.toolsOnAgent;

    try {
      const success = await handleEdit();

      if (!success) {
        return;
      }

      // Refresh the main agent list
      await fetchData();

      // Notify the menu to refresh its agent list
      window.dispatchEvent(new CustomEvent("agentUpdated"));

      toast({
        title: "Agent Updated",
        description: "Your agent has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating agent:", error);
      toast({
        title: "Error",
        description: "Failed to update agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateToken = async () => {
    if (!agent?.id || !regenerateToken) return;

    try {
      setIsLoading(true);
      const result = await regenerateToken(agent.id);

      if (result?.token) {
        // Update the agent state with the new token
        setAgent(prev => prev ? { ...prev, token: result.token } : null);

        // Refresh the main agent list to show updated token
        await fetchData();

        toast({
          title: "Token Regenerated",
          description: "A new integration token has been generated successfully.",
        });
      }
    } catch (error) {
      console.error("Error regenerating token:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onOpenRequestAccess = async () => {
    if (!makeCustomEndpointRequest) return;

    const result = await makeCustomEndpointRequest({
      path: "list/unassigned-agents",
      method: "GET",
      queryParams: {
        page: 1,
        page_size: 100,
        filters: "{}",
        ordering: "-createdAt",
      },
    });

    await getApprovalRequest({
      offset: 1,
      limit: 100,
    });
    setIsOpenUnassignedAgents(true);
  };

  const handleRequestAccess = async () => {
    setIsRequestAccessLoading(true);
    await handleSubmitRequestApproval(requestedAgents, "agent");
    setIsOpenUnassignedAgents(false);
    setIsRequestAccessLoading(false);
    setRequestedAgents([]);
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
                  You don&apos;t have the necessary permissions to view Agent
                  Management. Please contact your administrator if you believe
                  this is an error.
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Agent Management
              </h1>
              <CardDescription>
                Create and manage your AI chatbot agents
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              {canCreate && (
                <Button
                  className="max-lg:w-full flex items-center gap-2 cursor-pointer"
                  onClick={openCreateAgent}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Agent</span>
                </Button>
              )}
              <Button
                variant="outline"
                className="max-lg:w-full flex items-center gap-2 cursor-pointer"
                onClick={onOpenRequestAccess}
              >
                <User className="h-4 w-4" />
                <span>Organization Repositories</span>
              </Button>
              {session?.user?.roles?.includes("admin") && (
                <Button
                  variant="outline"
                  className="max-lg:w-full flex items-center gap-2 cursor-pointer relative"
                  onClick={() => {
                    router.push("/approval-request?process=agent");
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Approval Requests</span>
                  <span className="absolute -top-2 -right-2 bg-red-400 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {countOutstandingApproval
                      ? typeof countOutstandingApproval === "number"
                        ? countOutstandingApproval
                        : countOutstandingApproval.data
                      : "0"}
                  </span>
                </Button>
              )}
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col">
                  <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl">
                      Create New Agent
                    </DialogTitle>
                    <DialogDescription>
                      Create a new AI agent to handle specific types of
                      conversations.
                    </DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="flex-grow overflow-y-auto my-2">
                    <div className="space-y-3 px-4">
                      {isError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>
                            There was an error creating your agent. Please try
                            again.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <Label
                          htmlFor="agentName"
                          className="text-sm font-medium block mb-1"
                        >
                          Agent Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="agentName"
                          placeholder="Enter a descriptive name for your agent"
                          name="agentName"
                          onChange={handleInputChange}
                          className="focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose a clear name that describes the agent&apos;s
                          purpose
                        </p>
                      </div>

                      <AvatarSelection
                        selectedAvatar={selectedAvatar}
                        onSelect={(avatarId) => {
                          setSelectedAvatar(avatarId);
                          // Auto-set temperature based on avatar selection
                          let newTemperature = 0.7; // default
                          if (avatarId === "bot-classic") {
                            newTemperature = 0.3; // Lowest for Classic Bot
                          } else if (avatarId === "ai-modern") {
                            newTemperature = 1.5; // Creative for AI Assistant
                          } else if (avatarId === "brain-smart") {
                            newTemperature = 1.0; // Middle for Smart Brain
                          }
                          handleTemperatureChange([newTemperature]);
                        }}
                      />

                      {/* Temperature Setting */}
                      <div>
                        <Label className="text-sm font-medium block mb-2">
                          Temperature: {(payload?.temperature ?? 0.7).toFixed(1)}
                        </Label>
                        <div className="px-2">
                          <Slider
                            value={[payload?.temperature ?? 0.7]}
                            onValueChange={(value) => {
                              // Ensure we always get a valid number from the array
                              const newValue = Array.isArray(value) ? value[0] : value;
                              handleTemperatureChange([Number(newValue)]);
                            }}
                            max={2.0}
                            min={0.0}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>0.0 (Focused)</span>
                            <span>1.0 (Balanced)</span>
                            <span>2.0 (Creative)</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Controls randomness: lower values for more focused responses, higher values for more creative responses
                        </p>
                      </div>

                      {/* Image Generation Toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">
                              Image Generation
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Allow this agent to generate and work with images
                            </p>
                          </div>
                          <Switch
                            checked={payload?.imageGenerationEnabled ?? true}
                            onCheckedChange={(checked) => {
                              setPayload({
                                ...payload,
                                imageGenerationEnabled: checked,
                              });
                            }}
                          />
                        </div>
                      </div>

                      {(!isCommonUser) && (
                        <div className="space-y-2">
                          <Label htmlFor="visibilityType" className="block">
                            Visibility Type{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex flex-col gap-4 ">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={VisibilityType.PRIVATE}
                                  name="visibilityType"
                                  value={VisibilityType.PRIVATE}
                                  className="h-4 w-4"
                                  onChange={handleInputChange}
                                />
                                <Label
                                  htmlFor={VisibilityType.PRIVATE}
                                  className="font-medium"
                                >
                                  Private
                                </Label>
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                Only visible to you. Perfect for personal
                                knowledge bases and private research.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={VisibilityType.ORGANIZATION}
                                  name="visibilityType"
                                  value={VisibilityType.ORGANIZATION}
                                  className="h-4 w-4"
                                  onChange={handleInputChange}
                                />
                                <Label
                                  htmlFor={VisibilityType.ORGANIZATION}
                                  className="font-medium"
                                >
                                  Organization
                                </Label>
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                Shared within your organization. Requires
                                admin approval for access requests. You can
                                request access to this agent from <b>Organization Repositories</b> menu
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={VisibilityType.PUBLIC}
                                  name="visibilityType"
                                  value={VisibilityType.PUBLIC}
                                  className="h-4 w-4"
                                  onChange={handleInputChange}
                                />
                                <Label
                                  htmlFor={VisibilityType.PUBLIC}
                                  className="font-medium"
                                >
                                  Public
                                </Label>
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                Accessible to everyone. Can be directly used
                                without requesting access.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label
                          className="text-sm font-medium block mb-1"
                          htmlFor="systemInstruction"
                        >
                          System Instruction{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="systemInstruction"
                          placeholder="Describe how your agent should behave and what knowledge it should use"
                          className="h-40 focus:ring-2 focus:ring-primary/20"
                          name="systemInstruction"
                          onChange={(e) => {
                            handleInputChange(e);
                            handleDescribeChange(e);
                          }}
                          value={payload?.systemInstruction || ""}
                        />
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground">
                            Provide detailed instructions about the agent&apos;s
                            knowledge, tone, and behavior (min. 10 words)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payload?.systemInstruction?.length || 0} characters
                            {payload?.systemInstruction &&
                              payload.systemInstruction.length < 50 && (
                                <span className="text-amber-500 ml-1">
                                  (We recommend at least 50 characters for
                                  better results)
                                </span>
                              )}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label
                          className="text-sm font-medium block mb-1"
                          htmlFor="description"
                        >
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Add additional details about this agent's purpose and capabilities"
                          className="h-24 focus:ring-2 focus:ring-primary/20"
                          name="description"
                          onChange={handleInputChange}
                          value={payload?.description || ""}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Optional: Add notes about when and how to use this
                          agent
                        </p>
                        <Button
                          variant="outline"
                          className="border border-primary text-primary mt-2"
                          onClick={handleGenerateAIInstruction}
                          disabled={isLoadingAgent}
                        >
                          {isLoadingAgent ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating Instructions...
                            </>
                          ) : (
                            <>
                              <WandSparkles className="w-4 h-4 mr-2" />
                              Generate Instructions with AI
                            </>
                          )}
                        </Button>
                      </div>

                      {payload?.systemInstruction &&
                        payload.systemInstruction.length > 50 && (
                          <div className="mt-4 border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                            <h4 className="text-sm font-medium mb-2 flex items-center">
                              <Bot className="h-4 w-4 mr-2" />
                              Agent Preview
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <p>
                                Based on your instructions, your agent will:
                              </p>
                              <ul className="list-disc pl-5 mt-2 space-y-1">
                                {payload?.systemInstruction?.includes(
                                  "knowledge"
                                ) && <li>Provide knowledge-based responses</li>}
                                {payload?.systemInstruction?.includes(
                                  "help"
                                ) && <li>Offer helpful assistance</li>}
                                {payload?.systemInstruction?.includes(
                                  "question"
                                ) && (
                                    <li>
                                      Answer questions in your specified domain
                                    </li>
                                  )}
                                <li>
                                  Follow your specific instructions for tone and
                                  behavior
                                </li>
                              </ul>
                            </div>
                          </div>
                        )}

                      <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-sm font-medium">
                            Assign Knowledge
                          </Label>
                          <div className="text-xs text-muted-foreground">
                            {selectedKnowledge.length} of{" "}
                            {knowledgeData?.length || 0} selected
                          </div>
                        </div>

                        {/* Knowledge Search and Quick Actions */}
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Search knowledge..."
                              className="w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background pr-8"
                              value={knowledgeSearchTerm}
                              onChange={(e) =>
                                setKnowledgeSearchTerm(e.target.value)
                              }
                              disabled={isUpdating || isKnowledgeLoading}
                            />
                            {knowledgeSearchTerm ? (
                              <button
                                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                onClick={() => setKnowledgeSearchTerm("")}
                                disabled={isUpdating}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            ) : (
                              <svg
                                className="absolute right-2 top-2 h-5 w-5 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                              </svg>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedKnowledge(
                                knowledgeData
                                  ?.map((a) => a.id)
                                  .filter(
                                    (id): id is string => id !== undefined
                                  ) || []
                              )
                            }
                            disabled={
                              isUpdating ||
                              isKnowledgeLoading ||
                              !knowledgeData?.length
                            }
                            className="whitespace-nowrap"
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedKnowledge([])}
                            disabled={
                              isUpdating || selectedKnowledge.length === 0
                            }
                            className="whitespace-nowrap"
                          >
                            Clear All
                          </Button>
                        </div>

                        {/* Knowledge List */}
                        <div className="flex-1 overflow-hidden border rounded-md">
                          {isKnowledgeLoading ? (
                            <div className="flex items-center justify-center h-full py-8">
                              <svg
                                className="animate-spin h-5 w-5 text-primary mr-3"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              <span className="text-sm">
                                Loading knowledge...
                              </span>
                            </div>
                          ) : !knowledgeData || knowledgeData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                              <svg
                                className="h-12 w-12 text-gray-300 mb-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1}
                                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                />
                              </svg>
                              <p className="text-sm font-medium">
                                No knowledge available
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Add knowledge to the system before assigning
                                them to agents.
                              </p>
                            </div>
                          ) : filteredKnowledge.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                              <svg
                                className="h-12 w-12 text-gray-300 mb-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                              </svg>
                              <p className="text-sm font-medium">
                                No matching knowledge
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Try a different search term or clear the search.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => setKnowledgeSearchTerm("")}
                              >
                                Clear Search
                              </Button>
                            </div>
                          ) : (
                            <ScrollArea className="h-[250px] w-full">
                              <div className="p-1">
                                {filteredKnowledge.map((knowledge) => (
                                  <div
                                    key={knowledge.id}
                                    className={`flex items-start p-3 mb-1 rounded-md transition-colors cursor-pointer ${knowledge.id &&
                                      selectedKnowledge.includes(
                                        knowledge.id as string
                                      )
                                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                      : "border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                      }`}
                                    onClick={() => {
                                      if (isUpdating || !knowledge.id) return;

                                      if (
                                        selectedKnowledge.includes(
                                          knowledge.id as string
                                        )
                                      ) {
                                        setSelectedKnowledge((prev) =>
                                          prev.filter(
                                            (id) => id !== knowledge.id
                                          )
                                        );
                                      } else {
                                        setSelectedKnowledge((prev) => [
                                          ...prev,
                                          knowledge.id as string,
                                        ]);
                                      }
                                    }}
                                  >
                                    <Checkbox
                                      id={`knowledge-${knowledge.id}`}
                                      checked={
                                        !!(
                                          knowledge.id &&
                                          selectedKnowledge.includes(
                                            knowledge.id as string
                                          )
                                        )
                                      }
                                      onCheckedChange={(checked) => {
                                        if (isUpdating) return;

                                        if (checked) {
                                          setSelectedKnowledge((prev) => [
                                            ...prev,
                                            knowledge.id as string,
                                          ]);
                                        } else {
                                          setSelectedKnowledge((prev) =>
                                            prev.filter(
                                              (id) => id !== knowledge.id
                                            )
                                          );
                                        }
                                      }}
                                      disabled={isUpdating}
                                      className="mt-0.5 min-h-6 w-6 p-0"
                                    />
                                    <div className="ml-3 flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                          {knowledge.name}
                                        </span>

                                        {selectedKnowledge.includes(
                                          knowledge.id as string
                                        ) && (
                                            <Badge
                                              variant="outline"
                                              className="bg-blue-100 text-blue-600 px-2 py-0.5 text-xs"
                                            >
                                              Selected
                                            </Badge>
                                          )}
                                      </div>
                                      {knowledge.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {knowledge.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-2">
                          Agent can only access the knowledge they&apos;re
                          assigned to.
                        </p>
                      </div>
                    </div>
                  </ScrollArea>

                  <DialogFooter className="pt-2 border-t">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={onSave} className="gap-2">
                        <Save className="h-4 w-4" />
                        Create Agent
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* test */}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search agents..."
                  className="pl-10"
                  aria-label="Search Agents by Name"
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
                title="Refresh agent list"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredAgents?.length || 0} Agents
              </Badge>
            </div>
          </div>

          <div className="mt-4">
            <SmartLoadingWrapper
              isLoading={isLoading && !filteredAgents?.length}
              fallback={<TableSkeleton columnDefs={Array.from({ length: 8 })} />}
            >
              <AgentTable
                data={filteredAgents || []}
                loading={isLoading}
                viewAction={onView}
                editAction={onEdit}
                openKnowledgeAction={onOpenDialogKnowledge}
                setSelectedKnowledge={setSelectedKnowledge}
                totalItems={count || 0}
                pagination={pagination}
                session={session}
                canEdit={canEdit}
                canDelete={canDelete}
                canView={canView}
              />
            </SmartLoadingWrapper>
          </div>


          {/* View Dialog with ScrollArea */}
          <Dialog open={isOpenDetail} onOpenChange={setIsOpenDetail}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Agent Details
                </DialogTitle>
                <DialogDescription>
                  View detailed information about this agent
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-grow overflow-y-auto my-2">
                <div className="space-y-3 px-4">
                  {agent ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">
                            {agent?.agentName ?? ""}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Created on{" "}
                            {new Date(
                              agent?.createdAt || Date.now()
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={agent?.token ? "success" : "secondary"}>
                          {agent?.token ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          System Instruction
                        </h4>
                        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm whitespace-pre-wrap">
                          {agent?.systemInstruction ?? "-"}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Description
                        </h4>
                        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                          {agent?.description ?? "-"}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Temperature
                        </h4>
                        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md border text-sm">
                          {agent?.temperature?.toFixed(1) ?? "0.7"}
                          <span className="text-xs text-muted-foreground ml-2">
                            (
                            {agent?.temperature && agent.temperature < 0.5
                              ? "Focused"
                              : agent?.temperature && agent.temperature > 1.5
                                ? "Creative"
                                : "Balanced"}
                            )
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Controls response randomness and creativity
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          Integration Token
                        </h4>
                        <div className="flex items-center gap-2">
                          <Input
                            value={agent?.token ?? ""}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(agent?.token ?? "");
                              toast({
                                title: "Token Copied",
                                description:
                                  "Integration token copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRegenerateToken}
                            disabled={isLoading}
                            title="Regenerate Token"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use this token to integrate this agent with your
                          website
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-center items-center min-h-[200px]">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="pt-2 border-t">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpenDetail(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setIsOpenDetail(false);
                      onEdit(agent);
                    }}
                    className="gap-2"
                    disabled={agent?.user?.id !== userId}
                  >
                    <PenSquare className="h-4 w-4" />
                    Edit Agent
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog with ScrollArea */}
          <Dialog open={isOpenEdit} onOpenChange={setIsOpenEdit}>
            <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <PenSquare className="h-5 w-5" />
                  Edit Agent
                </DialogTitle>
                <DialogDescription>
                  Update your agent&apos;s information and behavior
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-grow overflow-y-auto my-2">
                <div className="space-y-3 px-4">
                  <div>
                    <Label
                      htmlFor="agentName"
                      className="text-sm font-medium block mb-1"
                    >
                      Agent Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="agentName"
                      placeholder="Agent Name"
                      name="agentName"
                      onChange={handleInputChange}
                      value={payload?.agentName ?? ""}
                      className="focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <AvatarSelection
                    selectedAvatar={selectedAvatar}
                    onSelect={(avatarId) => {
                      setSelectedAvatar(avatarId);
                      // Auto-set temperature based on avatar selection
                      let newTemperature = 0.7; // default
                      if (avatarId === "bot-classic") {
                        newTemperature = 0.3; // Lowest for Classic Bot
                      } else if (avatarId === "ai-modern") {
                        newTemperature = 1.5; // Creative for AI Assistant
                      } else if (avatarId === "brain-smart") {
                        newTemperature = 1.0; // Middle for Smart Brain
                      }
                      handleTemperatureChange([newTemperature]);
                    }}
                  />

                  {/* Temperature Setting */}
                  <div>
                    <Label className="text-sm font-medium block mb-2">
                      Temperature: {payload?.temperature?.toFixed(1) || "0.7"}
                    </Label>
                    <div className="px-2">
                      <Slider
                        value={[payload?.temperature ?? 0.7]}
                        onValueChange={(value) => {
                          // Ensure we always get a valid number from the array
                          const newValue = Array.isArray(value) ? value[0] : value;
                          handleTemperatureChange([Number(newValue)]);
                        }}
                        max={2.0}
                        min={0.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0.0 (Focused)</span>
                        <span>1.0 (Balanced)</span>
                        <span>2.0 (Creative)</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Controls randomness: lower values for more focused
                      responses, higher values for more creative responses
                    </p>
                  </div>

                  {/* Image Generation Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          Image Generation
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Allow this agent to generate and work with images
                        </p>
                      </div>
                      <Switch
                        checked={payload?.imageGenerationEnabled ?? true}
                        onCheckedChange={(checked) => {
                          setPayload({
                            ...payload,
                            imageGenerationEnabled: checked,
                          });
                        }}
                      />
                    </div>
                  </div>

                  {(!isCommonUser) && (
                    <div className="space-y-2">
                      <Label htmlFor="visibilityType" className="block">
                        Visibility Type <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex flex-col gap-4 ">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={VisibilityType.PRIVATE}
                              name="visibilityType"
                              value={VisibilityType.PRIVATE}
                              className="h-4 w-4"
                              onChange={handleInputChange}
                              checked={
                                payload?.visibilityType ===
                                VisibilityType.PRIVATE
                              }
                            />
                            <Label
                              htmlFor={VisibilityType.PRIVATE}
                              className="font-medium"
                            >
                              Private
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">
                            Only visible to you. Perfect for personal knowledge
                            bases and private research.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={VisibilityType.ORGANIZATION}
                              name="visibilityType"
                              value={VisibilityType.ORGANIZATION}
                              className="h-4 w-4"
                              onChange={handleInputChange}
                              checked={
                                payload?.visibilityType ===
                                VisibilityType.ORGANIZATION
                              }
                            />
                            <Label
                              htmlFor={VisibilityType.ORGANIZATION}
                              className="font-medium"
                            >
                              Organization
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">
                            Shared within your organization. Requires admin
                            approval for access requests.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={VisibilityType.PUBLIC}
                              name="visibilityType"
                              value={VisibilityType.PUBLIC}
                              className="h-4 w-4"
                              onChange={handleInputChange}
                              checked={
                                payload?.visibilityType ===
                                VisibilityType.PUBLIC
                              }
                            />
                            <Label
                              htmlFor={VisibilityType.PUBLIC}
                              className="font-medium"
                            >
                              Public
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">
                            Accessible to everyone. Can be directly used without
                            requesting access.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label
                      className="text-sm font-medium block mb-1"
                      htmlFor="systemInstruction"
                    >
                      System Instruction <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="systemInstruction"
                      placeholder="This is your system instruction to describe your knowledge, please fill it at least with 10 words"
                      className="h-40 focus:ring-2 focus:ring-primary/20"
                      name="systemInstruction"
                      onChange={(e) => {
                        handleInputChange(e);
                        handleDescribeChange(e);
                      }}
                      value={payload?.systemInstruction ?? ""}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground">
                        Provide detailed instructions about the agent&apos;s
                        knowledge, tone, and behavior (min. 10 words)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payload?.systemInstruction?.length || 0} characters
                        {payload?.systemInstruction &&
                          payload.systemInstruction.length > 50 && (
                            <span className="text-amber-500 ml-1">
                              (We recommend at least 50 characters for better
                              results)
                            </span>
                          )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label
                      className="text-sm font-medium block mb-1"
                      htmlFor="description"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Agent Description"
                      className="h-24 focus:ring-2 focus:ring-primary/20"
                      name="description"
                      onChange={handleInputChange}
                      value={payload?.description ?? ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional: Add notes about when and how to use this agent
                    </p>
                    <Button
                      variant="outline"
                      className="border border-primary text-primary mt-2"
                      onClick={handleGenerateAIInstruction}
                      disabled={isLoadingAgent}
                    >
                      {isLoadingAgent ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Instructions...
                        </>
                      ) : (
                        <>
                          <WandSparkles className="w-4 h-4 mr-2" />
                          Generate Instructions with AI
                        </>
                      )}
                    </Button>
                  </div>


                  {payload?.systemInstruction &&
                    payload.systemInstruction.length > 50 && (
                      <div className="mt-4 border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <Bot className="h-4 w-4 mr-2" />
                          Agent Preview
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Based on your instructions, your agent will:</p>
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            {payload?.systemInstruction?.includes(
                              "knowledge"
                            ) && <li>Provide knowledge-based responses</li>}
                            {payload?.systemInstruction?.includes("help") && (
                              <li>Offer helpful assistance</li>
                            )}
                            {payload?.systemInstruction?.includes(
                              "question"
                            ) && (
                                <li>Answer questions in your specified domain</li>
                              )}
                            <li>
                              Follow your specific instructions for tone and
                              behavior
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">
                        Assign Knowledge
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {selectedKnowledge.length} of{" "}
                        {knowledgeData?.length || 0} selected
                      </div>
                    </div>

                    {/* Knowledge Search and Quick Actions */}
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search knowledge..."
                          className="w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background pr-8"
                          value={knowledgeSearchTerm}
                          onChange={(e) =>
                            setKnowledgeSearchTerm(e.target.value)
                          }
                          disabled={isUpdating || isKnowledgeLoading}
                        />
                        {knowledgeSearchTerm ? (
                          <button
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                            onClick={() => setKnowledgeSearchTerm("")}
                            disabled={isUpdating}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        ) : (
                          <svg
                            className="absolute right-2 top-2 h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedKnowledge(
                            knowledgeData
                              ?.map((a) => a.id)
                              .filter((id): id is string => id !== undefined) ||
                            []
                          )
                        }
                        disabled={
                          isUpdating ||
                          isKnowledgeLoading ||
                          !knowledgeData?.length
                        }
                        className="whitespace-nowrap"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedKnowledge([])}
                        disabled={isUpdating || selectedKnowledge.length === 0}
                        className="whitespace-nowrap"
                      >
                        Clear All
                      </Button>
                    </div>

                    {/* Knowledge List */}
                    <div className="flex-1 overflow-hidden border rounded-md">
                      {isKnowledgeLoading ? (
                        <div className="flex items-center justify-center h-full py-8">
                          <svg
                            className="animate-spin h-5 w-5 text-primary mr-3"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span className="text-sm">Loading knowledge...</span>
                        </div>
                      ) : !knowledgeData || knowledgeData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                          <svg
                            className="h-12 w-12 text-gray-300 mb-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                            />
                          </svg>
                          <p className="text-sm font-medium">
                            No knowledge available
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add knowledge to the system before assigning them to
                            agents.
                          </p>
                        </div>
                      ) : filteredKnowledge.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                          <svg
                            className="h-12 w-12 text-gray-300 mb-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <p className="text-sm font-medium">
                            No matching knowledge
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Try a different search term or clear the search.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => setKnowledgeSearchTerm("")}
                          >
                            Clear Search
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="h-[250px] w-full">
                          <div className="p-1">
                            {filteredKnowledge.map((knowledge) => (
                              <div
                                key={knowledge.id}
                                className={`flex items-start p-3 mb-1 rounded-md transition-colors cursor-pointer ${knowledge.id &&
                                  selectedKnowledge.includes(
                                    knowledge.id as string
                                  )
                                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                  : "border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                  }`}
                                onClick={() => {
                                  if (isUpdating || !knowledge.id) return;

                                  if (
                                    selectedKnowledge.includes(
                                      knowledge.id as string
                                    )
                                  ) {
                                    setSelectedKnowledge((prev) =>
                                      prev.filter((id) => id !== knowledge.id)
                                    );
                                  } else {
                                    setSelectedKnowledge((prev) =>
                                      prev.includes(knowledge.id as string)
                                        ? prev
                                        : [...prev, knowledge.id as string]
                                    );
                                  }
                                }}
                              >
                                <Checkbox
                                  id={`knowledge-${knowledge.id}`}
                                  checked={
                                    !!(
                                      knowledge.id &&
                                      selectedKnowledge.includes(
                                        knowledge.id as string
                                      )
                                    )
                                  }
                                  onCheckedChange={(checked) => {
                                    if (isUpdating) return;

                                    if (checked) {
                                      setSelectedKnowledge((prev) =>
                                        prev.includes(knowledge.id as string)
                                          ? prev
                                          : [...prev, knowledge.id as string]
                                      );
                                    } else {
                                      setSelectedKnowledge((prev) =>
                                        prev.filter((id) => id !== knowledge.id)
                                      );
                                    }
                                  }}
                                  disabled={isUpdating}
                                  className="mt-0.5 min-h-6 w-6 p-0"
                                />
                                <div className="ml-3 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      {knowledge.name}
                                    </span>

                                    {selectedKnowledge.includes(
                                      knowledge.id as string
                                    ) && (
                                        <Badge
                                          variant="outline"
                                          className="bg-blue-100 text-blue-600 px-2 py-0.5 text-xs"
                                        >
                                          Selected
                                        </Badge>
                                      )}
                                  </div>
                                  {knowledge.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {knowledge.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Agent can only access the knowledge they&apos;re assigned
                      to.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="pt-2 border-t">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpenEdit(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={onSubmitEdit} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirmation Dialog for AI Generation */}
          <Dialog
            open={showConfirmGenerate}
            onOpenChange={setShowConfirmGenerate}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Confirm Generate Instructions</DialogTitle>
                <DialogDescription>
                  This will replace your current system instructions and
                  description. Are you sure you want to continue?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmGenerate(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={generateInstructions}
                  disabled={isLoadingAgent}
                >
                  {isLoadingAgent ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Knowledge Assigned */}
          <Dialog open={isOpenKnowledge} onOpenChange={setIsOpenKnowledge}>
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
                  Assigned Knowledge
                </DialogTitle>
                <DialogDescription>
                  {filterSelectedKnowledge.length} knowledge
                  {filterSelectedKnowledge.length !== 1 ? "s" : ""} assigned to
                  this agent.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-auto pr-2 mt-2">
                {filterSelectedKnowledge.length > 0 ? (
                  <div className="space-y-3">
                    {filterSelectedKnowledge.map(
                      (ua: KnowledgeData, index: number) => (
                        <div
                          key={ua.agentId || `agent-${index}`}
                          className="flex items-center p-4 border rounded-md hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 shrink-0">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                              <circle cx="12" cy="12" r="4"></circle>
                            </svg>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="font-medium text-base">
                              {ua?.name || "Unknown Agent"}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {ua?.description || "No description available"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {ua.agent?.tags &&
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
                                )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-blue-100 text-blue-600 ml-2 shrink-0"
                          >
                            Knowledge
                          </Badge>
                        </div>
                      )
                    )}
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
                  onClick={() => setIsOpenKnowledge(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Unassigned Agents Dialog */}
          <Dialog
            open={isOpenUnassignedAgents}
            onOpenChange={setIsOpenUnassignedAgents}
          >
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Available Organization Repositories
                </DialogTitle>
                {/* <DialogDescription>
                  This following agent are available to be used. Before use it, you must request access to your organization administrator for approval.
                </DialogDescription> */}
              </DialogHeader>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col h-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="available">Available Agents</TabsTrigger>
                  <TabsTrigger value="history">Request History</TabsTrigger>
                </TabsList>

                <TabsContent value="available">
                  <div className="text-sm text-muted-foreground mb-2">
                    The following agents are available to be used. Before using
                    them, you must request access from your organization
                    administrator for approval.
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">
                        Available Agents
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {requestedAgents.length} of{" "}
                        {unassignedAgents?.length || 0} selected
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-3 px-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search agents..."
                          className="w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background pr-8"
                          value={unassignedAgentSearchTerm}
                          onChange={(e) =>
                            setUnassignedAgentSearchTerm(e.target.value)
                          }
                          disabled={isUpdating || isKnowledgeLoading}
                        />
                        {unassignedAgentSearchTerm ? (
                          <button
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                            onClick={() => setUnassignedAgentSearchTerm("")}
                            disabled={isUpdating}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        ) : (
                          <svg
                            className="absolute right-2 top-2 h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Agent List */}
                    <div className="flex-1 overflow-hidden border rounded-md">
                      {loading ? (
                        <div className="flex items-center justify-center h-full py-8">
                          <svg
                            className="animate-spin h-5 w-5 text-primary mr-3"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span className="text-sm">Loading agents...</span>
                        </div>
                      ) : !filteredUnassignedAgents ||
                        filteredUnassignedAgents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                          <Bot className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-sm font-medium">
                            No agents available
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            There are no agents available for access requests at
                            this time.
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[250px] w-full">
                          <div className="p-1">
                            {filteredUnassignedAgents.map((agent: Data) => (
                              <div
                                key={agent.id}
                                className={`flex items-start p-3 mb-1 rounded-md transition-colors cursor-pointer ${agent.id && requestedAgents.includes(agent.id)
                                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                  : "border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                  } ${(agent.approval_requests?.length ?? 0) > 0
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                  }`}
                                onClick={() => {
                                  if (
                                    (agent.approval_requests?.length ?? 0) > 0
                                  )
                                    return;
                                  if (!agent.id) return;

                                  if (requestedAgents.includes(agent.id)) {
                                    setRequestedAgents((prev) =>
                                      prev.filter((id) => id !== agent.id)
                                    );
                                  } else {
                                    setRequestedAgents((prev) => [
                                      ...prev,
                                      agent.id || "",
                                    ]);
                                  }
                                }}
                              >
                                <Checkbox
                                  id={`request-${agent.id}`}
                                  checked={
                                    !!(
                                      agent.id &&
                                      requestedAgents.includes(agent.id)
                                    )
                                  }
                                  onCheckedChange={(checked) => {
                                    if (!agent.id) return;

                                    if (checked) {
                                      setRequestedAgents((prev) => [
                                        ...prev,
                                        agent.id || "",
                                      ]);
                                    } else {
                                      setRequestedAgents((prev) =>
                                        prev.filter((id) => id !== agent.id)
                                      );
                                    }
                                  }}
                                  disabled={
                                    (agent.approval_requests?.length ?? 0) > 0
                                  }
                                  className="mt-0.5"
                                />
                                <div className="ml-3 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      {agent.agentName}
                                    </span>
                                    {agent.id &&
                                      requestedAgents.includes(agent.id) && (
                                        <Badge
                                          variant="outline"
                                          className="bg-blue-100 text-blue-600 px-2 py-0.5 text-xs"
                                        >
                                          Selected
                                        </Badge>
                                      )}
                                  </div>
                                  {agent.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {agent.description}
                                    </p>
                                  )}
                                  {agent.visibilityType && (
                                    <div className="mt-2">
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {agent.visibilityType}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Select the agents you want to request access to. Your
                      request will be reviewed by administrators.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <div className="text-sm text-muted-foreground mb-2">
                    View the status of your previous agent access requests.
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">
                        Request History
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {approvalRequestData.length} Total Requests
                      </div>
                    </div>

                    {/* Agent List */}
                    <div className="flex-1 overflow-hidden border rounded-md">
                      {loading ? (
                        <div className="flex items-center justify-center h-full py-8">
                          <svg
                            className="animate-spin h-5 w-5 text-primary mr-3"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span className="text-sm">Loading agents...</span>
                        </div>
                      ) : approvalRequestData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                          <Bot className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-sm font-medium">
                            No requests found
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            You haven&apos;t made any requests yet.
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[250px] w-full">
                          <div className="p-1">
                            {approvalRequestData.map(
                              (request: ApprovalRequestData) => (
                                <div
                                  key={request.id}
                                  className={`flex items-start p-3 mb-1 rounded-md transition-colors border hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <div className="flex-1 flex-col">
                                      <span className="text-sm font-medium">
                                        {request.agent?.[0]?.agentName}
                                      </span>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {request.agent?.[0]?.description}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {request.status ===
                                          ApprovalStatus.ACTIVE && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                              Approved at{" "}
                                              {request.approvedAt
                                                ? new Date(
                                                  request.approvedAt
                                                ).toLocaleString()
                                                : ""}
                                            </p>
                                          )}
                                      </p>
                                    </div>
                                    <ApprovalStatusBadge
                                      status={request.status as ApprovalStatus}
                                      className="h-min"
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="pt-4 border-t mt-4">
                <div className="flex justify-between w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsOpenUnassignedAgents(false);
                      setRequestedAgents([]);
                    }}
                    disabled={isRequestAccessLoading}
                  >
                    Cancel
                  </Button>
                  {activeTab === "available" && (
                    <Button
                      onClick={async () => {
                        await handleRequestAccess();
                      }}
                      disabled={
                        requestedAgents.length === 0 || isRequestAccessLoading
                      }
                    >
                      {isRequestAccessLoading && (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      )}
                      Submit Requests
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </ToastProvider>
  );
};
