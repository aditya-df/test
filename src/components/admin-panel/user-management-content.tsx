/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ColDef } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SmartLoadingWrapper } from "@/components/ui/loading-skeletons/smart-loading-wrapper";
import { Skeleton } from "@/components/ui/loading-skeletons/skeleton-base";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TableComponent from "@/components/layouts/table";
import { toast } from "@/hooks/use-toast";
import { CheckCRUDPermission } from "@/utils/access-check";
import { Data } from "@/stores/users/model";
import { getOrganizationColor } from "@/utils/utils";
import { useStore as userStore } from "@/stores/users/useStore";
import { useStore as onboardingStore } from "@/stores/onboarding/verify/useStore";
import {
  Check,
  Lock,
  Trash2,
  TriangleAlert,
  KeyRound,
  Pencil,
  Shield,
  Search,
  Users,
  MoreVertical,
  Building2,
  MapPin,
  Mail,
} from "lucide-react";
import { adminResetUserPassword } from "@/services/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSWR from "swr";
import { usePaginationTable } from "@/hooks/use-pagination-table";
import { PaginationComponent } from "../ui/pagination/pagination-component";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore as useOrganizationStore } from "@/stores/organization/useStore";
import TableSkeleton from "../skeleton/table";

type UserRole = "user" | "admin" | "superadmin";

interface UserManagementContentProps {
  hasAccess: boolean;
  session: any;
  MENU_CONST: string;
}

interface Agent {
  id: string;
  agentName: string;
  description?: string;
  tags?: string[];
}

interface UserAgent {
  userId: string;
  agentId: string;
  agent: Agent;
}

interface Organization {
  id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}

export const UserManagementContent = ({
  hasAccess,
  session,
  MENU_CONST,
}: UserManagementContentProps) => {
  const router = useRouter();
  const canEdit = CheckCRUDPermission(session, MENU_CONST, "update");
  const canDelete = CheckCRUDPermission(session, MENU_CONST, "delete");
  const canView = CheckCRUDPermission(session, MENU_CONST, "read");

  // Get the current user's ID for self-deletion check
  const currentUserId = session?.user?.id;
  const userRoles = session?.user?.roles || [];
  const isSuperAdmin = Array.isArray(userRoles)
    ? userRoles.includes("superadmin")
    : userRoles === "superadmin";
  const isAdmin = Array.isArray(userRoles)
    ? userRoles.includes("admin")
    : userRoles === "admin";
  const isCommonUser = Array.isArray(userRoles)
    ? userRoles.includes("user")
    : userRoles === "user";

  const hasValidAccess = (hasAccess && canView) || isSuperAdmin;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!hasValidAccess && countdown === null && !isRedirecting) {
      setCountdown(5);
      setIsRedirecting(true);
    }
  }, [hasValidAccess, countdown, isRedirecting]);

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

  // Enhanced access control check
  if (!hasValidAccess) {
    return (
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
                You don&apos;t have the necessary permissions to view User
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
    );
  }

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const onboarding = onboardingStore();
  const users = userStore();
  const pagination = usePaginationTable({ totalItems: onboarding.count || 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Data | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // States for organization and agents dialogs
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [selectedUserOrgs, setSelectedUserOrgs] = useState<any[]>([]);
  const [selectedUserAgents, setSelectedUserAgents] = useState<UserAgent[]>([]);
  const [dialogUserName, setDialogUserName] = useState("");

  // States for organization editing
  const [orgEditDialogOpen, setOrgEditDialogOpen] = useState(false);
  const [orgSearchTerm, setOrgSearchTerm] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<
    string | null
  >(null);

  // Access data and loading state from the store
  const userData = onboarding.data;
  const isLoading = onboarding.loading || users.loading;

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery || !userData) return userData;

    return userData.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userData, searchQuery]);

  // Fetch all agents for selection in edit dialog
  const { data: agentsData, isLoading: isAgentsLoading } = useSWR<Agent[]>(
    "/api/agent?limit=1000",
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = await res.json();
      // Handle different response formats
      if (data && data.data && Array.isArray(data.data)) {
        return data.data;
      } else if (Array.isArray(data)) {
        return data;
      }
      return [];
    },
    { revalidateOnFocus: false, revalidateOnMount: true }
  );

  // Fetch all organizations for selection in edit dialog
  const organizationStore = useOrganizationStore();

  // Access organizations data from store
  const organizationsData = organizationStore.data || [];
  const isOrgsLoading = organizationStore.loading;

  // Add useEffect to fetch organizations when component mounts or when edit dialog opens
  useEffect(() => {
    // Fetch organizations when component mounts
    organizationStore.getList({ offset: 1, limit: 1000 });
  }, []);

  // Filtered agents based on search term
  const filteredAgents = useMemo(() => {
    if (!agentsData) return [];

    return agentsData.filter(
      (agent) =>
        agent.agentName.toLowerCase().includes(agentSearchTerm.toLowerCase()) ||
        (agent.description &&
          agent.description
            .toLowerCase()
            .includes(agentSearchTerm.toLowerCase()))
    );
  }, [agentsData, agentSearchTerm]);

  // Filtered organizations based on search term
  const filteredOrganizations = useMemo(() => {
    if (!organizationsData) return [];

    return organizationsData.filter(
      (org) =>
        org.name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
        (org.address &&
          org.address.toLowerCase().includes(orgSearchTerm.toLowerCase())) ||
        (org.email &&
          org.email.toLowerCase().includes(orgSearchTerm.toLowerCase()))
    );
  }, [organizationsData, orgSearchTerm]);

  // Fetch user-agent assignments
  const { data: userAgentsData, mutate: mutateUserAgents } = useSWR<
    Record<string, UserAgent[]>
  >(
    "/api/user-agents",
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch user agents");
      return res.json();
    },
    { revalidateOnFocus: false, revalidateOnMount: true }
  );

  useEffect(() => {
    onboarding.getList({
      offset: ((pagination.currentPage - 1) * pagination.pageSize),
      limit: pagination.pageSize,
    });
  }, [pagination.currentPage, pagination.pageSize]);

  const handleApproveOrCancel = async (dataUser: Data) => {
    if (!dataUser || !dataUser.id) {
      console.error("Invalid user data received:", dataUser);
      toast({
        title: "Error",
        description: "Cannot update user: invalid user data",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      setIsUpdating(true);

      const completeUserData = userData.find((u) => u.id === dataUser.id);

      if (!completeUserData) {
        throw new Error(`Could not find complete data for user ${dataUser.id}`);
      }

      const updateData = {
        ...completeUserData,
        isVerified: !completeUserData.isVerified,
      };

      await onboarding.update(updateData);

      toast({
        title: completeUserData.isVerified
          ? "User Unverified"
          : "User Verified",
        description: `User has been ${completeUserData.isVerified ? "unverified" : "verified"
          } successfully.`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating verification status:", error);
      toast({
        title: "Error",
        description: "Failed to update user verification status.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (user: Data) => {
    const originalUserData = userData.find((u) => u.id === user.id);

    if (!originalUserData) {
      toast({
        title: "Error",
        description: "Failed to find complete user data for editing.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const userCopy = JSON.parse(JSON.stringify(originalUserData));

    setUserToEdit(userCopy);

    // Set current agent assignments
    if (userAgentsData && userAgentsData[user.id]) {
      const currentAgentIds = userAgentsData[user.id].map((ua) => ua.agentId);
      setSelectedAgents(currentAgentIds);
    } else {
      setSelectedAgents([]);
    }

    // Set current organization assignment (single selection)
    if (
      originalUserData.organization &&
      Array.isArray(originalUserData.organization) &&
      originalUserData.organization.length > 0
    ) {
      const firstOrgId = originalUserData.organization[0].organizationId;
      setSelectedOrganization(firstOrgId || null);
    } else {
      setSelectedOrganization(null);
    }

    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!userToEdit) return;

    try {
      setIsUpdating(true);

      const originalUserData = userData.find((u) => u.id === userToEdit.id);

      if (!originalUserData) {
        toast({
          title: "Error",
          description: "Failed to find complete user data for saving.",
          variant: "destructive",
          duration: 3000,
        });
        setIsUpdating(false);
        return;
      }

      const userUpdateData = {
        ...originalUserData,
        role: userToEdit.role,
      };

      await users.update(userUpdateData);

      try {
        const agentResponse = await fetch("/api/user-agents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userToEdit.id,
            agentIds: selectedAgents,
          }),
        });

        if (!agentResponse.ok) {
          const errorData = await agentResponse.json().catch(() => ({}));
          console.error("Agent assignment API error:", errorData);
          throw new Error(
            `Failed to update agent assignments: ${agentResponse.status}`
          );
        }
      } catch (agentError) {
        console.error("Error updating agent assignments:", agentError);
        throw agentError;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      await Promise.all([
        onboarding.getList({ offset: 0, limit: 1000 }),
        mutateUserAgents(undefined, { revalidate: true }),
      ]);

      toast({
        title: "User Updated",
        description:
          "The user's role and agent access have been successfully updated.",
        duration: 3000,
      });

      setEditDialogOpen(false);
      setAgentSearchTerm("");
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update the user. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // New function to handle organization save
  const handleOrgSave = async () => {
    if (!userToEdit) return;

    try {
      setIsUpdating(true);

      // Call API to update user organization (single selection)
      const orgResponse = await fetch("/api/user-organizations", {
        method: "PUT", // Changed from POST to PUT
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userToEdit.id,
          organizationIds: selectedOrganization ? [selectedOrganization] : [], // Convert single selection to array for API
        }),
      });

      if (!orgResponse.ok) {
        const errorData = await orgResponse.json().catch(() => ({}));
        console.error("Organization assignment API error:", errorData);
        throw new Error(
          `Failed to update organization assignment: ${orgResponse.status} - ${errorData.message || "Unknown error"
          }`
        );
      }

      // Refresh user data
      await onboarding.getList({ offset: 0, limit: 1000 });

      toast({
        title: "Organization Updated",
        description:
          "User's organization assignment has been successfully updated.",
        duration: 3000,
      });

      // Close both dialogs after successful update
      setOrgEditDialogOpen(false);
      setEditDialogOpen(false); // Close the main Edit User Access dialog

      // Reset search terms and selections
      setOrgSearchTerm("");
      setSelectedOrganization(null);
      setAgentSearchTerm(""); // Also reset agent search term
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update user organization. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (userId: string) => {
    if (userId === currentUserId) {
      toast({
        title: "Cannot Delete Yourself",
        description: "You cannot delete your own account.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (userId: string | null) => {
    try {
      if (userId) {
        if (userId === currentUserId) {
          toast({
            title: "Cannot Delete Yourself",
            description: "You cannot delete your own account.",
            variant: "destructive",
            duration: 3000,
          });
          setDeleteDialogOpen(false);
          return;
        }

        setIsUpdating(true);
        await onboarding.delete(userId);
        toast({
          title: "User Deleted",
          description: "The user has been successfully deleted.",
          duration: 3000,
        });
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete the user. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleChange = async (
    userId: string,
    newRole: UserRole,
    dataUser: Data
  ) => {
    try {
      setIsUpdating(true);
      await onboarding.update({ ...dataUser, role: newRole });

      toast({
        title: "Role Updated",
        description: `User's role has been successfully updated to ${newRole}.`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating user role:", error);

      toast({
        title: "Error",
        description: "Failed to update user's role. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setIsUpdating(true);
      const result = await adminResetUserPassword(userId);

      if (result === "success") {
        toast({
          title: "Password Reset Email Sent",
          description:
            "A password reset link has been sent to the user's email.",
          duration: 3000,
        });
      } else if (result === "not-found") {
        toast({
          title: "Error",
          description: "User not found.",
          variant: "destructive",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send password reset email. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Extract role from user data in a consistent way
  const extractRole = (roleValue: any): UserRole => {
    if (!roleValue) return "user";

    if (typeof roleValue === "string") {
      return (roleValue as string).toLowerCase() as UserRole;
    }

    if (Array.isArray(roleValue) && roleValue.length > 0) {
      return (roleValue[0] as string).toLowerCase() as UserRole;
    }

    if (typeof roleValue === "object") {
      const roleName = roleValue.name || roleValue.role;
      if (typeof roleName === "string") {
        return roleName.toLowerCase() as UserRole;
      }
    }

    return "user";
  };

  const getNormalizedRole = (role: any): UserRole => {
    const validRoles: UserRole[] = ["user", "admin", "superadmin"];
    const extractedRole = extractRole(role);
    return validRoles.includes(extractedRole) ? extractedRole : "user";
  };

  const handleOrgDialogClose = () => {
    setOrgEditDialogOpen(false);
    setOrgSearchTerm("");
    setSelectedOrganization(null); // Reset selection
  };

  // Setup wheel and touch handlers for table scrolling
  useEffect(() => {
    const tableAreaContainer = tableContainerRef.current;
    if (tableAreaContainer) {
      const handleWheel = (e: WheelEvent) => {
        const agBodyViewport =
          tableAreaContainer.querySelector(".ag-body-viewport");
        if (agBodyViewport) {
          agBodyViewport.scrollTop += e.deltaY;
        }
      };
      tableAreaContainer.addEventListener("wheel", handleWheel, {
        passive: true,
      });
      return () => tableAreaContainer.removeEventListener("wheel", handleWheel);
    }
  }, []);

  useEffect(() => {
    const tableAreaContainer = tableContainerRef.current;
    if (tableAreaContainer) {
      let startY: number;

      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0]?.clientY ?? 0;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          const deltaY = startY - e.touches[0].clientY;
          const agBodyViewport =
            tableAreaContainer.querySelector(".ag-body-viewport");
          if (agBodyViewport) {
            agBodyViewport.scrollTop += deltaY;
          }
          startY = e.touches[0].clientY;
        }
      };

      tableAreaContainer.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      tableAreaContainer.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });

      return () => {
        tableAreaContainer.removeEventListener("touchstart", handleTouchStart);
        tableAreaContainer.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, []);

  // Use useMemo for column definitions to prevent recreation on every render
  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: "name", headerName: "Name" },
      {
        field: "username",
        headerName: "Username",
        cellRenderer: (props: any) => {
          if (!props || props.value === null || props.value === undefined) {
            return <span className="text-gray-400 italic">No username</span>;
          }
          return props.value;
        }
      },
      { field: "email", headerName: "Email" },
      {
        field: "organization",
        headerName: "Organization",
        cellRenderer: (props: any) => {
          if (!props || !props.value || !props.data) {
            return (
              <span className="text-gray-400 italic">No organization</span>
            );
          }

          try {
            const organizations = props.value || [];
            const userName = props.data.name || "User";

            const orgsArray = Array.isArray(organizations)
              ? organizations
              : organizations.userOrganizations || [];

            if (orgsArray.length === 0) {
              return (
                <span className="text-gray-400 italic">No organization</span>
              );
            }

            // Generate organization colors based on organization ID for consistency
            const getOrgColor = (orgId: string) => {
              const colors = [
                "text-blue-600 bg-blue-50",
                "text-green-600 bg-green-50",
                "text-purple-600 bg-purple-50",
                "text-orange-600 bg-orange-50",
                "text-pink-600 bg-pink-50",
                "text-indigo-600 bg-indigo-50",
                "text-red-600 bg-red-50",
                "text-yellow-600 bg-yellow-50",
                "text-teal-600 bg-teal-50",
                "text-cyan-600 bg-cyan-50",
              ];

              // Create a simple hash from organization ID to ensure consistent colors
              let hash = 0;
              for (let i = 0; i < orgId.length; i++) {
                hash = ((hash << 5) - hash + orgId.charCodeAt(i)) & 0xffffffff;
              }
              return colors[Math.abs(hash) % colors.length];
            };

            return (
              <div className="flex flex-wrap gap-1">
                {orgsArray.map((org: any, index: number) => {
                  const orgId = org?.organizationId || org?.id;
                  const orgName =
                    org?.organization?.name || org?.name || "Unknown";
                  const colorClass = getOrgColor(orgId);

                  return (
                    <span
                      key={orgId}
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorClass} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserOrgs(orgsArray);
                        setDialogUserName(userName);
                        setOrgDialogOpen(true);
                      }}
                      title={`Click to view all organizations for ${userName}`}
                    >
                      {orgName}
                    </span>
                  );
                })}
              </div>
            );
          } catch (error) {
            console.error("Error rendering organization cell:", error, props);
            return <span className="text-red-400 italic">Error</span>;
          }
        },
        cellStyle: {
          display: "flex",
          alignItems: "center",
          padding: "8px",
        },
        width: 200,
      },
      {
        field: "assignedAgents",
        headerName: "Assigned Agents",
        cellRenderer: (props: any) => {
          if (!props || !props.data || !props.data.id || !userAgentsData) {
            return (
              <span className="text-gray-400 italic">No agents assigned</span>
            );
          }

          try {
            const userId = props.data.id;
            const userName = props.data.name || "User";
            const userAgents = userAgentsData[userId] || [];

            if (userAgents.length === 0) {
              return (
                <span className="text-gray-400 italic">No agents assigned</span>
              );
            }

            return (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUserAgents(userAgents);
                  setDialogUserName(userName);
                  setAgentDialogOpen(true);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
                {userAgents.length} Agent{userAgents.length !== 1 ? "s" : ""}
              </Button>
            );
          } catch (error) {
            console.error(
              "Error rendering assigned agents cell:",
              error,
              props
            );
            return <span className="text-red-400 italic">Error</span>;
          }
        },
        cellStyle: {
          display: "flex",
          alignItems: "center",
          padding: "8px",
        },
        width: 200,
      },
      {
        field: "isVerified",
        headerName: "Status",
        width: 120,
        cellRenderer: (props: any) => {
          if (props === undefined || props.value === undefined) {
            return <span className="text-gray-400 italic">Unknown</span>;
          }

          try {
            return (
              <Badge
                variant="outline"
                className={
                  "w-20 justify-center " +
                  (props.value
                    ? "bg-green-100 text-green-600"
                    : "bg-orange-100 text-orange-600")
                }
              >
                {props.value ? "VERIFIED" : "UNVERIFIED"}
              </Badge>
            );
          } catch (error) {
            console.error("Error rendering status cell:", error, props);
            return <span className="text-red-400 italic">Error</span>;
          }
        },
      },
      {
        field: "role",
        headerName: "Role",
        width: 250,
        cellRenderer: (props: any) => {
          if (!props || props.value === undefined) {
            return <span className="text-gray-400 italic">Unknown role</span>;
          }

          try {
            const roleValue = extractRole(props.value);
            const validRoles: UserRole[] = ["user", "admin", "superadmin"];
            const currentRole = validRoles.includes(roleValue)
              ? roleValue
              : "user";

            return (
              <div>
                <Select
                  disabled={
                    !canEdit ||
                    isUpdating ||
                    !props.data ||
                    !props.data.id ||
                    // Admin cannot change superadmin
                    (isAdmin && !isSuperAdmin && currentRole === "superadmin") ||
                    // User cannot change superadmin or admin
                    (isCommonUser && (currentRole === "superadmin" || currentRole === "admin" || currentRole === "user"))
                  }
                  value={currentRole}
                  onValueChange={(value: UserRole) => {
                    if (props.data && props.data.id) {
                      handleRoleChange(props.data.id, value, props.data);
                    } else {
                      console.error(
                        "Cannot change role: Invalid user data",
                        props.data
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    {/* Admin option - disabled for regular users */}
                    <SelectItem
                      value="admin"
                      disabled={isCommonUser}
                    >
                      Admin
                    </SelectItem>
                    {/* Super Admin option - only enabled for superadmins */}
                    <SelectItem
                      value="superadmin"
                      disabled={!isSuperAdmin}
                    >
                      Super Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          } catch (error) {
            console.error("Error rendering role cell:", error, props);
            return <span className="text-red-400 italic">Error</span>;
          }
        },
      },
      ...(canEdit || canDelete
        ? [
          {
            field: "action",
            headerName: "Action",
            width: 200,
            cellRenderer: (props: any) => {
              if (!props || !props.data || !props.data.id) {
                return (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      Invalid data
                    </span>
                  </div>
                );
              }

              try {
                const isCurrentUser = props.data.id === currentUserId;

                // Mobile/Tablet view (three-dot menu)
                const MobileActions = () => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600 hover:bg-gray-50"
                        disabled={isUpdating}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {/* Reset Password - Superadmin can reset any user, Admin can't reset superadmin */}
                      <DropdownMenuItem
                        onClick={() => {
                          if (props.data && props.data.id) {
                            handleResetPassword(props.data.id);
                          }
                        }}
                        disabled={
                          isUpdating ||
                          isCommonUser ||
                          // Admin cannot reset superadmin
                          (isAdmin && !isSuperAdmin && extractRole(props.data.role) === "superadmin")
                        }
                        className="flex items-center gap-2"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>

                      {canEdit && (
                        <>
                          {/* Edit User - Superadmin can edit any user, Admin can't edit superadmin */}
                          <DropdownMenuItem
                            onClick={() => {
                              if (props.data && props.data.id) {
                                handleEditClick(props.data);
                              }
                            }}
                            disabled={
                              isUpdating ||
                              isCommonUser ||
                              // Admin cannot edit superadmin
                              (isAdmin && !isSuperAdmin && extractRole(props.data.role) === "superadmin")
                            }
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit User & Assign Agents
                          </DropdownMenuItem>

                          {/* Verify/Unverify User - Superadmin can verify any user, Admin can't verify superadmin */}
                          <DropdownMenuItem
                            onClick={() => {
                              if (props.data && props.data.id) {
                                handleApproveOrCancel(props.data);
                              }
                            }}
                            disabled={
                              isUpdating ||
                              isCommonUser ||
                              // Admin cannot verify/unverify superadmin
                              (isAdmin && !isSuperAdmin && extractRole(props.data.role) === "superadmin")
                            }
                            className={`flex items-center gap-2 ${props?.data?.isVerified
                              ? "text-green-600"
                              : "text-orange-600"
                              }`}
                          >
                            {props.data?.isVerified ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <TriangleAlert className="h-4 w-4" />
                            )}
                            {props.data?.isVerified
                              ? "Unverify User"
                              : "Verify User"}
                          </DropdownMenuItem>
                        </>
                      )}

                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          {/* Delete User - Superadmin can delete any user, Admin can't delete superadmin */}
                          <DropdownMenuItem
                            onClick={() => {
                              if (props.data && props.data.id) {
                                handleDeleteClick(props.data.id);
                              }
                            }}
                            disabled={
                              isCurrentUser ||
                              isUpdating ||
                              isCommonUser ||
                              // Admin cannot delete superadmin
                              (isAdmin && !isSuperAdmin && extractRole(props.data.role) === "superadmin")
                            }
                            className={`flex items-center gap-2 text-red-600 ${isCurrentUser ? "opacity-50" : ""
                              }`}
                          >
                            <Trash2 className="h-4 w-4" />
                            {isCurrentUser
                              ? "Cannot delete yourself"
                              : "Delete User"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );

                // Desktop view (individual buttons)
                const DesktopActions = () => (
                  <div className="flex items-center justify-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-600 hover:bg-gray-50"
                            onClick={() => {
                              if (props.data && props.data.id) {
                                handleResetPassword(props.data.id);
                              }
                            }}
                            disabled={isUpdating || isCommonUser}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Reset Password</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {canEdit && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  if (props.data && props.data.id) {
                                    handleEditClick(props.data);
                                  }
                                }}
                                disabled={isUpdating || isCommonUser}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Edit User & Assign Agents</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${props?.data?.isVerified
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-orange-600 hover:bg-orange-50"
                                  }`}
                                onClick={() => {
                                  if (props.data && props.data.id) {
                                    handleApproveOrCancel(props.data);
                                  } else {
                                    console.error(
                                      "Cannot verify/unverify: Invalid user data",
                                      props.data
                                    );
                                  }
                                }}
                                disabled={isUpdating || isCommonUser}
                              >
                                {props.data?.isVerified ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <TriangleAlert className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>
                                {props.data?.isVerified
                                  ? "Unverify User"
                                  : "Verify User"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}

                    {canDelete && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (props.data && props.data.id) {
                                  handleDeleteClick(props.data.id);
                                }
                              }}
                              disabled={isCurrentUser || isUpdating || isCommonUser}
                            >
                              <Trash2
                                className={`h-4 w-4 ${isCurrentUser ? "opacity-50" : ""
                                  }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>
                              {isCurrentUser
                                ? "Cannot delete yourself"
                                : "Delete User"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                );

                return (
                  <>
                    {/* Show dropdown menu on mobile/tablet (< lg breakpoint) */}
                    <div className="block 3xl:hidden">
                      <MobileActions />
                    </div>
                    {/* Show individual buttons on desktop (>= lg breakpoint) */}
                    <div className="hidden 3xl:block">
                      <DesktopActions />
                    </div>
                  </>
                );
              } catch (error) {
                console.error("Error rendering action cell:", error, props);
                return <span className="text-red-400 italic">Error</span>;
              }
            },
          },
        ]
        : []),
    ],
    [
      canEdit,
      canDelete,
      userAgentsData,
      handleApproveOrCancel,
      handleRoleChange,
      currentUserId,
      isUpdating,
      isSuperAdmin, // Add this dependency
    ]
  );

  return (
    <Card className="w-full mt-6 shadow-sm rounded-lg border">
      <CardHeader className="border-b rounded-t-lg bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </h1>
            <CardDescription>
              Manage users, roles, and permissions within your organization
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-10"
              aria-label="Search Users"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredUsers?.length || 0} Users
            </Badge>
          </div>
        </div>

        <SmartLoadingWrapper
          isLoading={isLoading && (!userData || userData.length === 0)}
          fallback={<TableSkeleton columnDefs={columnDefs} />}
        >
          <div className="rounded-lg overflow-hidden">
            <div ref={tableContainerRef} className="w-full">
              <TableComponent
                key={`user-table-${userAgentsData ? "loaded" : "loading"}`}
                loading={isLoading || isUpdating}
                rowData={filteredUsers}
                columnDefs={columnDefs}
                suppressLoadingOverlay={false}
                animateRows={false}
                onGridReady={() => {
                  if (filteredUsers) {
                    const invalidItems = filteredUsers.filter(
                      (item) => !item || !item.id
                    );
                    if (invalidItems.length > 0) {
                      console.warn("Found invalid data items:", invalidItems);
                    }
                  }
                }}
              />
            </div>
          </div>
        </SmartLoadingWrapper>


        <PaginationComponent
          totalPages={pagination.totalPages}
          pageSizeOptions={pagination.pageSizeOptions}
          totalItems={onboarding.count || 0}
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage} 
          onPageSizeChange={pagination.setPageSize}
        />

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(userToDelete)}
                className="flex items-center gap-1"
                disabled={isUpdating}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog with Agent Assignment */}
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!isUpdating) {
              setEditDialogOpen(open);
              if (!open) {
                setAgentSearchTerm("");
                setOrgSearchTerm(""); // Clear org search when closing
              }
            }
          }}
        >
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit User Access</DialogTitle>
              <DialogDescription>
                Manage user role, organization, and agent access permissions.
              </DialogDescription>
            </DialogHeader>

            {userToEdit && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* User Information Section */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    User Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Name
                      </Label>
                      <div className="font-medium mt-1">{userToEdit.name}</div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Email
                      </Label>
                      <div className="font-medium mt-1">{userToEdit.email}</div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Status
                      </Label>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={
                            userToEdit.isVerified
                              ? "bg-green-100 text-green-600"
                              : "bg-orange-100 text-orange-600"
                          }
                        >
                          {userToEdit.isVerified ? "VERIFIED" : "UNVERIFIED"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Organization
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex flex-wrap gap-1 flex-1">
                          {userToEdit.organization &&
                            Array.isArray(userToEdit.organization) &&
                            userToEdit.organization.length > 0 ? (
                            userToEdit.organization.map((org: any) => {
                              const orgName =
                                org.organization?.name || org.name || "Unknown";
                              return (
                                <Badge
                                  key={
                                    org.organizationId ||
                                    org.id ||
                                    Math.random().toString()
                                  }
                                  variant="outline"
                                  className={`${getOrganizationColor(orgName)}`}
                                >
                                  {orgName}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              None
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOrgEditDialogOpen(true)}
                          disabled={isUpdating}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Role Section */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium">User Role</Label>
                  </div>

                  <Select
                    value={getNormalizedRole(userToEdit.role)}
                    onValueChange={(value: string) =>
                      setUserToEdit({ ...userToEdit, role: value })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {/* Only show Super Admin option if current user is super admin */}
                      {isSuperAdmin && (
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-muted-foreground mt-1">
                    This determines the user&apos;s permissions within the
                    system.
                  </p>
                </div>

                {/* Agent Assignment Section */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium">Assign Agents</Label>
                    <div className="text-xs text-muted-foreground">
                      {selectedAgents.length} of {agentsData?.length || 0}{" "}
                      selected
                    </div>
                  </div>

                  {/* Agent Search and Quick Actions */}
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search agents..."
                        className="w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background pr-8"
                        value={agentSearchTerm}
                        onChange={(e) => setAgentSearchTerm(e.target.value)}
                        disabled={isUpdating || isAgentsLoading}
                      />
                      {agentSearchTerm ? (
                        <button
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                          onClick={() => setAgentSearchTerm("")}
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
                        setSelectedAgents(agentsData?.map((a) => a.id) || [])
                      }
                      disabled={
                        isUpdating || isAgentsLoading || !agentsData?.length
                      }
                      className="whitespace-nowrap"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAgents([])}
                      disabled={isUpdating || selectedAgents.length === 0}
                      className="whitespace-nowrap"
                    >
                      Clear All
                    </Button>
                  </div>

                  {/* Agent List */}
                  <div className="flex-1 overflow-hidden border rounded-md">
                    {isAgentsLoading ? (
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
                    ) : !agentsData || agentsData.length === 0 ? (
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
                          No agents available
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add agents to the system before assigning them to
                          users.
                        </p>
                      </div>
                    ) : filteredAgents.length === 0 ? (
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
                          No matching agents
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try a different search term or clear the search.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setAgentSearchTerm("")}
                        >
                          Clear Search
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="h-[250px] w-full">
                        <div className="p-1">
                          {filteredAgents.map((agent) => (
                            <div
                              key={agent.id}
                              className={`flex items-start p-3 mb-1 rounded-md transition-colors cursor-pointer ${selectedAgents.includes(agent.id)
                                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                : "border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                }`}
                              onClick={() => {
                                if (isUpdating) return;

                                if (selectedAgents.includes(agent.id)) {
                                  setSelectedAgents((prev) =>
                                    prev.filter((id) => id !== agent.id)
                                  );
                                } else {
                                  setSelectedAgents((prev) => [
                                    ...prev,
                                    agent.id,
                                  ]);
                                }
                              }}
                            >
                              <Checkbox
                                id={`agent-${agent.id}`}
                                checked={selectedAgents.includes(agent.id)}
                                onCheckedChange={(checked) => {
                                  if (isUpdating) return;

                                  if (checked) {
                                    setSelectedAgents((prev) => [
                                      ...prev,
                                      agent.id,
                                    ]);
                                  } else {
                                    setSelectedAgents((prev) =>
                                      prev.filter((id) => id !== agent.id)
                                    );
                                  }
                                }}
                                disabled={isUpdating}
                                className="mt-0.5"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {agent.agentName}
                                  </span>

                                  {selectedAgents.includes(agent.id) && (
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
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Users can only access the agents they&apos;re assigned to.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSave}
                className="flex items-center gap-1"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Organization Edit Dialog */}
        <Dialog open={orgEditDialogOpen} onOpenChange={setOrgEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Edit User Organization
              </DialogTitle>
              <DialogDescription>
                Select an organization to assign to {userToEdit?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Organization Search */}
              <div className="flex items-center space-x-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    className="w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background pr-8"
                    value={orgSearchTerm}
                    onChange={(e) => setOrgSearchTerm(e.target.value)}
                    disabled={isUpdating || isOrgsLoading}
                  />
                  {orgSearchTerm ? (
                    <button
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      onClick={() => setOrgSearchTerm("")}
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

                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {selectedOrganization ? "1 selected" : "None selected"}
                </div>
              </div>

              {/* Organization List */}
              <div className="flex-1 overflow-hidden border rounded-md">
                {isOrgsLoading ? (
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
                    <span className="text-sm">Loading organizations...</span>
                  </div>
                ) : !organizationsData || organizationsData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <Building2 className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium">
                      No organizations available
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add organizations to the system before assigning them to
                      users.
                    </p>
                  </div>
                ) : filteredOrganizations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <Search className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium">
                      No matching organizations
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try a different search term or clear the search.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setOrgSearchTerm("")}
                    >
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] w-full">
                    <div className="p-1">
                      {/* Add "None" option */}
                      <div
                        className={`flex items-start p-3 mb-1 rounded-md transition-colors cursor-pointer ${!selectedOrganization
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                          : "border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                        onClick={() => {
                          if (isUpdating) return;
                          setSelectedOrganization(null);
                        }}
                      >
                        <input
                          type="radio"
                          id="org-none"
                          name="organization"
                          checked={!selectedOrganization}
                          onChange={() => setSelectedOrganization(null)}
                          disabled={isUpdating}
                          className="mt-1"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              No Organization
                            </span>
                            {!selectedOrganization && (
                              <Badge
                                variant="outline"
                                className="bg-blue-100 text-blue-600 px-2 py-0.5 text-xs"
                              >
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Remove user from all organizations
                          </p>
                        </div>
                      </div>

                      {/* Organization options */}
                      {filteredOrganizations.map((org) => {
                        // Add null/undefined checks
                        if (!org || !org.id) {
                          return null;
                        }

                        const orgId = org.id;
                        const orgName = org.name || "Unknown Organization";
                        const orgAddress = org.address || "";
                        const orgEmail = org.email || "";

                        return (
                          <div
                            key={orgId}
                            className={`flex items-start p-3 mb-1 rounded-md transition-colors cursor-pointer ${selectedOrganization === orgId
                              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                              : "border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              }`}
                            onClick={() => {
                              if (isUpdating) return;
                              setSelectedOrganization(orgId);
                            }}
                          >
                            <input
                              type="radio"
                              id={`org-${orgId}`}
                              name="organization"
                              checked={selectedOrganization === orgId}
                              onChange={() => setSelectedOrganization(orgId)}
                              disabled={isUpdating}
                              className="mt-1"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {orgName}
                                </span>
                                {selectedOrganization === orgId && (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-100 text-blue-600 px-2 py-0.5 text-xs"
                                  >
                                    Selected
                                  </Badge>
                                )}
                              </div>
                              {orgAddress && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {orgAddress}
                                </p>
                              )}
                              {orgEmail && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {orgEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                User will be associated with the selected organization.
              </p>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => setOrgEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleOrgSave}
                className="flex items-center gap-1"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Saving...
                  </>
                ) : (
                  "Save Organization"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Organizations Dialog */}
        <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
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
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                Organizations for {dialogUserName}
              </DialogTitle>
              <DialogDescription>
                {selectedUserOrgs.length} organization
                {selectedUserOrgs.length !== 1 ? "s" : ""} assigned to this
                user.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto pr-2 mt-2">
              {selectedUserOrgs.length > 0 ? (
                <div className="space-y-3">
                  {selectedUserOrgs.map((org: any, index: number) => {
                    const orgId =
                      org?.organizationId || org?.id || `org-${index}`;
                    const orgName =
                      org?.organization?.name || org?.name || "Unknown";

                    return (
                      <section
                        key={orgId}
                        className="flex items-center p-4 border rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <div
                          className={`w-1.5 h-full min-h-[48px] rounded-l-md ${getOrganizationColor(
                            orgName
                          )}`}
                        ></div>

                        <section className="ml-4 flex-1">
                          <div className="font-medium text-base">{orgName}</div>

                          <div className="text-sm text-muted-foreground mt-1">
                            {org?.organization?.description ||
                              "No description available"}
                          </div>

                          {org?.organization?.website && (
                            <div className="text-xs text-blue-600 mt-1">
                              <a
                                href={org.organization.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1"
                                >
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                {org.organization.website}
                              </a>
                            </div>
                          )}
                        </section>

                        <Badge
                          variant="outline"
                          className={`${getOrganizationColor(orgName)} ml-2`}
                        >
                          {org?.organization?.type || "Organization"}
                        </Badge>
                      </section>
                    );
                  })}
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
                    <rect
                      x="2"
                      y="7"
                      width="20"
                      height="14"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <p className="text-lg font-medium">
                    No organizations assigned
                  </p>
                  <p className="text-sm">
                    This user doesn&apos;t have any organization assignments.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setOrgDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Agents Dialog */}
        <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
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
                Agents for {dialogUserName}
              </DialogTitle>
              <DialogDescription>
                {selectedUserAgents.length} agent
                {selectedUserAgents.length !== 1 ? "s" : ""} assigned to this
                user.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto pr-2 mt-2">
              {selectedUserAgents.length > 0 ? (
                <div className="space-y-3">
                  {selectedUserAgents.map((ua: UserAgent, index: number) => (
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
                          {ua.agent?.agentName || "Unknown Agent"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {ua.agent?.description || "No description available"}
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
                onClick={() => setAgentDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
