/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import TableComponent from "@/components/layouts/table";
import { toast } from "@/hooks/use-toast";
import {
  Building2,
  Lock,
  Trash2,
  Pencil,
  Shield,
  Search,
  Users,
  MoreVertical,
  Plus,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  User,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
// import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/stores/organization/useStore";
import { useAuthStore } from "@/utils/auth-utils-client";
import { StaticPaginationComponent } from "../ui/pagination/static-pagination-component";
import { useAsyncAction } from "@/hooks/use-async-action";
import TableSkeleton from "../skeleton/table";

interface OrganizationManagementContentProps {
  hasAccess?: boolean;
  sessionAuthConfig: any;
}

interface Organization {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  user_organizations?: Array<{
    userId: string;
    organizationId: string;
    user: {
      id: string;
      name: string;
      email: string;
      username: string | null;
    };
  }>;
}

function UserCard({ currentItems }: any) {
  return (
    <>
      {currentItems &&
        currentItems.map((item: any, index: any) => {
          const user = item.user;
          return (
            <div
              key={`user-${index}`}
              className="flex items-center gap-x-4 pl-3 pr-4 py-3 border rounded-md hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 shrink-0">
                <User className="w-6 h-6" />
              </div>

              <div className="flex-1">
                <p className="font-medium text-base break-all leading-tight">
                  {user?.name || "Unknown User"}
                  {user?.username && (
                    <span className="text-xs text-muted-foreground font-light italic ml-1">
                      @{user.username}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground leading-tight">
                  {user?.email || "No email"}
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-green-100 text-green-600 ml-2 shrink-0"
              >
                Member
              </Badge>
            </div>
          );
        })}
    </>
  );
}

export const OrganizationManagementContent = ({
  //hasAccess,
  sessionAuthConfig,
}: OrganizationManagementContentProps) => {
  const router = useRouter();
  const { session } = useAuthStore();
  // Use the organization store
  const {
    getList,
    create,
    update,
    delete: deleteOrganization,
    loading,
    error,
    data: organizations,
    count,
  } = useStore();

  // Additional superadmin check
  const userRoles = sessionAuthConfig?.user?.roles || [];
  const isSuperAdmin = Array.isArray(userRoles)
    ? userRoles.includes("superadmin")
    : userRoles === "superadmin";

  const hasValidAccess = isSuperAdmin;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin && countdown === null && !isRedirecting) {
      setCountdown(5);
      setIsRedirecting(true);
    }
  }, [isSuperAdmin, countdown, isRedirecting]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (!isSuperAdmin && countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            router.push("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isSuperAdmin, countdown, router]);

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
                You don&apos;t have the necessary permissions to view
                Organization Management.
                {!isSuperAdmin &&
                  " Only super administrators can access this section."}
                Please contact your administrator if you believe this is an
                error.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Required permission: Super Admin Access</span>
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

  // State management
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<
    string | null
  >(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [organizationToEdit, setOrganizationToEdit] =
    useState<Organization | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedOrgUsers, setSelectedOrgUsers] = useState<any[]>([]);
  const [dialogOrgName, setDialogOrgName] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  // Pagination setup
  const pagination = usePaginationTable({ totalItems: count || 0 });

  const { loading: loadingFetch, run: runFetch } = useAsyncAction(
    async () =>
      await getList({
        offset: ((pagination.currentPage - 1) * pagination.pageSize),
        limit: pagination.pageSize,
      })
  );

  // Fetch organizations data
  const fetchData = useCallback(async () => {
    if (session?.user?.backendToken) {
      runFetch();
    }
  }, [getList, pagination.currentPage, pagination.pageSize, session]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter organizations based on search query
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery || !organizations) return organizations;

    return organizations.filter(
      (org) =>
        org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [organizations, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      toast({
        title: "Refreshed Successfully",
        description: "Organization list has been updated.",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh organization list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  const handleCreateClick = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
    });
    setCreateDialogOpen(true);
  };

  const handleEditClick = (organization: Organization) => {
    setOrganizationToEdit(organization);
    setFormData({
      name: organization.name || "",
      address: organization.address || "",
      phone: organization.phone || "",
      email: organization.email || "",
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (organizationId: string) => {
    setOrganizationToDelete(organizationId);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    try {
      setIsUpdating(true);

      await create(formData as any);

      // Refresh the data
      await fetchData();

      toast({
        title: "Organization Created",
        description: "The organization has been successfully created.",
        duration: 3000,
      });

      setCreateDialogOpen(false);
      setFormData({ name: "", address: "", phone: "", email: "" });
    } catch (error) {
      console.error("Error creating organization:", error);
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditSave = async () => {
    if (!organizationToEdit) return;

    try {
      setIsUpdating(true);

      await update({ ...formData, id: organizationToEdit.id } as any);

      // Refresh the data
      await fetchData();

      toast({
        title: "Organization Updated",
        description: "The organization has been successfully updated.",
        duration: 3000,
      });

      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (organizationId: string | null) => {
    try {
      if (organizationId) {
        setIsUpdating(true);

        await deleteOrganization(organizationId);

        // Refresh the data
        await fetchData();

        toast({
          title: "Organization Deleted",
          description: "The organization has been successfully deleted.",
          duration: 3000,
        });

        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast({
        title: "Error",
        description: "Failed to delete organization. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewUsers = (organization: Organization) => {
    // Map user_organizations to the expected format for the dialog
    const mappedUsers =
      organization.user_organizations?.map((userOrg) => ({
        userId: userOrg.userId,
        user: userOrg.user,
      })) || [];

    setSelectedOrgUsers(mappedUsers);
    setDialogOrgName(organization.name);
    setUsersDialogOpen(true);
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

  // Column definitions
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "name",
        headerName: "Organization Name",
        width: 200,
        cellRenderer: (props: any) => {
          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium">{props.value}</span>
            </div>
          );
        },
      },
      {
        field: "address",
        headerName: "Address",
        width: 250,
        cellRenderer: (props: any) => {
          return (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">{props.value}</span>
            </div>
          );
        },
      },
      {
        field: "email",
        headerName: "Email",
        width: 200,
        cellRenderer: (props: any) => {
          if (!props.value)
            return <span className="text-gray-400 italic">No email</span>;
          return (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{props.value}</span>
            </div>
          );
        },
      },
      {
        field: "phone",
        headerName: "Phone",
        width: 150,
        cellRenderer: (props: any) => {
          if (!props.value)
            return <span className="text-gray-400 italic">No phone</span>;
          return (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{props.value}</span>
            </div>
          );
        },
      },
      {
        field: "userCount",
        headerName: "Users",
        width: 120,
        cellRenderer: (props: any) => {
          // Get user count from user_organizations array based on the API response structure
          const userCount = props.data?.user_organizations?.length || 0;

          return (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewUsers(props.data);
              }}
            >
              <Users className="w-4 h-4 mr-1" />
              {userCount} User{userCount !== 1 ? "s" : ""}
            </Button>
          );
        },
        cellStyle: {
          display: "flex",
          alignItems: "center",
          padding: "8px",
        },
      },
      // {
      //     field: "createdAt",
      //     headerName: "Created",
      //     width: 120,
      //     cellRenderer: (props: any) => {
      //         if (!props.value) return <span className="text-gray-400 italic">Unknown</span>;
      //         return (
      //             <span className="text-sm text-gray-600">
      //                 {new Date(props.value).toLocaleDateString()}
      //             </span>
      //         );
      //     },
      // },
      {
        field: "action",
        headerName: "Action",
        width: 120,
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
                <DropdownMenuItem
                  onClick={() => handleEditClick(props.data)}
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Organization
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(props.data.id)}
                  disabled={isUpdating}
                  className="flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Organization
                </DropdownMenuItem>
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
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleEditClick(props.data)}
                      disabled={isUpdating}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Edit Organization</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteClick(props.data.id)}
                      disabled={isUpdating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Delete Organization</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );

          return (
            <>
              {/* Show dropdown menu on mobile/tablet (< lg breakpoint) */}
              <div className="block lg:hidden">
                <MobileActions />
              </div>
              {/* Show individual buttons on desktop (>= lg breakpoint) */}
              <div className="hidden lg:block">
                <DesktopActions />
              </div>
            </>
          );
        },
      },
    ],
    [isUpdating]
  );

  return (
    <Card className="w-full mt-6 shadow-sm rounded-lg border">
      <CardHeader className="border-b rounded-t-lg bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Management
            </h1>
            <CardDescription>
              Manage organizations and their settings within your system
            </CardDescription>
          </div>
          <Button onClick={handleCreateClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Organization
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search organizations..."
                className="pl-10"
                aria-label="Search Organizations"
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
              title="Refresh organization list"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredOrganizations?.length || 0} Organizations
            </Badge>
          </div>
        </div>

        <SmartLoadingWrapper
          isLoading={loadingFetch && (!organizations || organizations.length === 0)}
          fallback={<TableSkeleton columnDefs={columnDefs} />}
        >
          <div className="rounded-lg overflow-hidden">
            <div ref={tableContainerRef} className="w-full">
              <TableComponent
                loading={loadingFetch || isUpdating}
                rowData={filteredOrganizations}
                columnDefs={columnDefs}
                suppressLoadingOverlay={false}
                animateRows={false}
              />
            </div>
          </div>
        </SmartLoadingWrapper>


        <PaginationComponent
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          totalItems={count || 0}
          totalPages={pagination.totalPages}
          pageSizeOptions={pagination.pageSizeOptions}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />

        {/* Create Organization Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Add a new organization to the system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter organization name"
                  disabled={isUpdating}
                />
              </div>

              <div>
                <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Enter organization address"
                  disabled={isUpdating}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter organization email"
                  disabled={isUpdating}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter organization phone"
                  disabled={isUpdating}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isUpdating || !formData.name || !formData.address}
              >
                {isUpdating ? "Creating..." : "Create Organization"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Organization Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
              <DialogDescription>
                Update organization information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Organization Name <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter organization name"
                  disabled={isUpdating}
                />
              </div>

              <div>
                <Label htmlFor="edit-address">Address <span className="text-red-500">*</span></Label>
                <Textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Enter organization address"
                  disabled={isUpdating}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter organization email"
                  disabled={isUpdating}
                />
              </div>

              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter organization phone"
                  disabled={isUpdating}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={isUpdating || !formData.name || !formData.address}
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Organization</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this organization? This action
                cannot be undone and will remove all associated data.
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
                onClick={() => handleDelete(organizationToDelete)}
                className="flex items-center gap-1"
                disabled={isUpdating}
              >
                <Trash2 className="h-4 w-4" />
                {isUpdating ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Users Dialog */}
        <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users in {dialogOrgName}
              </DialogTitle>
              <DialogDescription>
                {selectedOrgUsers.length} user
                {selectedOrgUsers.length !== 1 ? "s" : ""} belong to this
                organization.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-hidden">
              {selectedOrgUsers.length > 0 ? (
                <StaticPaginationComponent
                  items={selectedOrgUsers}
                  className="max-h-[22rem]"
                >
                  {({ currentItems }: any) => (
                    <div className="space-y-2">
                      <UserCard currentItems={currentItems} />
                    </div>
                  )}
                </StaticPaginationComponent>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No users assigned</p>
                  <p className="text-sm">
                    This organization doesn&apos;t have any users assigned yet.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setUsersDialogOpen(false)}
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
