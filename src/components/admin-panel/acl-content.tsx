"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useStore } from "@/stores/acl/useStore";
import { Data } from "@/stores/acl/model";
import TableComponent from "../layouts/table";
import {
  Lock,
  Plus,
  Search,
  Shield,
  Eye,
  Edit,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { CheckCRUDPermission } from "@/utils/access-check";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePaginationTable } from "@/hooks/use-pagination-table";
import { PaginationComponent } from "../ui/pagination/pagination-component";
import { useRouter } from "next/navigation";
import TableSkeleton from "../skeleton/table";
import { SmartLoadingWrapper } from "@/components/ui/loading-skeletons/smart-loading-wrapper";
import { Skeleton } from "@/components/ui/loading-skeletons/skeleton-base";


// Types based on the Prisma model
type UserRole = "user" | "admin" | "superadmin";
type MenuType =
  | "MANAGE_USERS"
  | "CHATBOT"
  | "MANAGE_KNOWLEDGE"
  | "MANAGE_AGENTS"
  | "DASHBOARD"
  | "MANAGE_ACL";

export const ACLManagement = ({
  hasAccess,
  session,
  MENU_CONST,
}: {
  hasAccess: boolean;
  session?: any;
  MENU_CONST: string;
}) => {
  const router = useRouter();

  const canEdit = CheckCRUDPermission(session, MENU_CONST, "update");
  const canDelete = CheckCRUDPermission(session, MENU_CONST, "delete");
  const canCreate = CheckCRUDPermission(session, MENU_CONST, "create");
  const canView = CheckCRUDPermission(session, MENU_CONST, "read");

  const hasValidAccess = hasAccess && canView;
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

  // Track current theme for forcing table refresh
  const [currentTheme, setCurrentTheme] = useState<string | null>(
    typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null
  );

  // Listen for theme changes
  useEffect(() => {
    const handleStorageChange = () => {
      const theme = localStorage.getItem("theme");
      setCurrentTheme(theme);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("app-theme-change", handleStorageChange);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, [key, value]);
      if (key === "theme") {
        setCurrentTheme(value);
        window.dispatchEvent(new Event("app-theme-change"));
      }
    };

    const intervalId = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("app-theme-change", handleStorageChange);
      localStorage.setItem = originalSetItem;
      clearInterval(intervalId);
    };
  }, []);

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
                You don&apos;t have the necessary permissions to view ACL
                Management. Please contact your administrator if you believe
                this is an error.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Required permission: Read Access</span>
            </div>

            {/* IMPROVED: Better countdown display with loading state */}
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

            {/* Manual redirect button as fallback */}
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="mt-4"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const store = useStore();
  const { data, loading, count } = store;
  const pagination = usePaginationTable({ totalItems: count || 0 });



  const [aclEntries, setAclEntries] = useState<Data[]>(data || []);
  const [editingEntry, setEditingEntry] = useState<Data | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) {
      const convertedData: Data[] = data.map((item: Data) => ({
        id: item.id,
        menuType: item.menuType as MenuType,
        role: item.role as UserRole,
        create: item.create || false,
        update: item.update || false,
        delete: item.delete || false,
        read: item.read || false,
      }));
      setAclEntries(convertedData);
    }
  }, [data]);

  const loadData = useCallback(() => {
    store.getList({
      offset: ((pagination.currentPage - 1) * pagination.pageSize),
      limit: pagination.pageSize,
      role: selectedRole,
    });
  }, [pagination.currentPage, pagination.pageSize, selectedRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter entries based on search and role
  const filteredEntries = useMemo(() => {
    let filtered = aclEntries;

    if (searchQuery) {
      filtered = filtered.filter(
        (entry) =>
          entry.menuType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [aclEntries, searchQuery]);

  const handleCreateNew = useCallback(() => {
    setEditingEntry(null);
    setIsViewMode(false);
    setIsDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingEntry(null);
      setIsViewMode(false);
    }
  }, []);

  const handleCreate = useCallback(
    async (entry: Omit<Data, "id">) => {
      try {
        await store.create(entry);

        toast({
          title: "Success!",
          description: "ACL entry created successfully.",
        });

        setIsDialogOpen(false);
        setEditingEntry(null);
        setIsViewMode(false);
      } catch (error) {
        console.error("Error creating ACL entry:", error);
        toast({
          title: "Error",
          description: "Failed to create ACL entry. Please try again.",
          variant: "destructive",
        });
      }
    },
    [store]
  );

  const handleUpdate = useCallback(
    async (updatedEntry: Data) => {
      try {
        if (!isViewMode) {
          await store.update({ id: updatedEntry.id, ...updatedEntry });

          toast({
            title: "Success!",
            description: "ACL entry updated successfully.",
          });
        }

        setIsDialogOpen(false);
        setEditingEntry(null);
        setIsViewMode(false);
      } catch (error) {
        console.error("Error updating ACL entry:", error);
        toast({
          title: "Error",
          description: "Failed to update ACL entry. Please try again.",
          variant: "destructive",
        });
      }
    },
    [store, isViewMode]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await store.delete(id);

        toast({
          title: "Success!",
          description: "ACL entry deleted successfully.",
        });
      } catch (error) {
        console.error("Error deleting ACL entry:", error);
        toast({
          title: "Error",
          description: "Failed to delete ACL entry. Please try again.",
          variant: "destructive",
        });
      }
    },
    [store]
  );

  const handleTogglePermission = useCallback(
    async (id: string, field: keyof Data, value: boolean) => {
      try {
        const entry = aclEntries.find((entry) => entry.id === id);
        if (entry) {
          const updatedEntry = { ...entry, [field]: value };
          await store.update(updatedEntry);

          setAclEntries((prevEntries) =>
            prevEntries.map((entry) =>
              entry.id === id ? { ...entry, [field]: value } : entry
            )
          );

          toast({
            title: "Success!",
            description: `Permission updated successfully.`,
          });
        }
      } catch (error) {
        console.error("Error updating permission:", error);
        toast({
          title: "Error",
          description: "Failed to update permission. Please try again.",
          variant: "destructive",
        });

        setAclEntries((prevEntries) =>
          prevEntries.map((entry) =>
            entry.id === id ? { ...entry, [field]: !value } : entry
          )
        );
      }
    },
    [store, aclEntries]
  );

  // Scroll handlers
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

  const handleView = useCallback(
    async (entry: Data) => {
      try {
        if (!entry.id) {
          throw new Error("Entry ID is undefined");
        }
        const detailedEntry = await store.getDetail(entry.id);
        if (!detailedEntry) {
          throw new Error("Failed to fetch entry details");
        }
        setEditingEntry(detailedEntry);
        setIsViewMode(true);
        setIsDialogOpen(true);
      } catch (error) {
        console.error("Error in handleView:", error);
        toast({
          title: "Error",
          description: "Failed to load ACL details",
          variant: "destructive",
        });
      }
    },
    [store]
  );

  const handleEditClick = useCallback(
    async (entry: Data) => {
      try {
        if (!entry.id) {
          throw new Error("Entry ID is undefined");
        }
        const detailedEntry = await store.getDetail(entry.id);
        if (!detailedEntry) {
          throw new Error("Failed to fetch entry details");
        }
        setEditingEntry(detailedEntry);
        setIsViewMode(false);
        setIsDialogOpen(true);
      } catch (error) {
        console.error("Error in handleEditClick:", error);
        toast({
          title: "Error",
          description: "Failed to load ACL details for editing",
          variant: "destructive",
        });
      }
    },
    [store]
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "menuType" as keyof Data,
        headerName: "Menu Type",
        filter: true,
        sortable: true,
        minWidth: 150,
      },
      {
        field: "role" as keyof Data,
        headerName: "Role",
        filter: true,
        sortable: true,
        minWidth: 120,
        valueFormatter: (params: any) => {
          const roleMap: { [key: string]: string } = {
            user: "User",
            admin: "Admin",
            superadmin: "Super Admin",
          };
          return roleMap[params.value] || params.value;
        },
      },
      {
        field: "create" as keyof Data,
        headerName: "Create",
        width: 100,
        cellRenderer: (params: { value: boolean; data: Data }) => (
          <Switch
            disabled={!canEdit}
            checked={params.value}
            onCheckedChange={(checked) =>
              handleTogglePermission(params.data.id!, "create", checked)
            }
            className="p-0 min-h-4"
          />
        ),
      },
      {
        field: "read" as keyof Data,
        headerName: "Read",
        width: 100,
        cellRenderer: (params: { value: boolean; data: Data }) => (
          <Switch
            disabled={!canEdit}
            checked={params.value}
            onCheckedChange={(checked) =>
              handleTogglePermission(params.data.id!, "read", checked)
            }
            className="p-0 min-h-4"
          />
        ),
      },
      {
        field: "update" as keyof Data,
        headerName: "Update",
        width: 100,
        cellRenderer: (params: { value: boolean; data: Data }) => (
          <Switch
            disabled={!canEdit}
            checked={params.value}
            onCheckedChange={(checked) =>
              handleTogglePermission(params.data.id!, "update", checked)
            }
            className="p-0 min-h-4"
          />
        ),
      },
      {
        field: "delete" as keyof Data,
        headerName: "Delete",
        width: 100,
        cellRenderer: (params: { value: boolean; data: Data }) => (
          <Switch
            disabled={!canEdit}
            checked={params.value}
            onCheckedChange={(checked) =>
              handleTogglePermission(params.data.id!, "delete", checked)
            }
            className="p-0 min-h-4"
          />
        ),
      },
      ...(canEdit || canDelete
        ? [
          {
            headerName: "Actions",
            width: 160,
            cellRenderer: (params: { data: Data }) => (
              <div className="flex justify-end items-center gap-1 py-2 pr-3">
                {canView && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 p-0"
                          onClick={() => handleView(params.data)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>View ACL details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {canEdit && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:bg-green-50 p-0"
                          onClick={() => handleEditClick(params.data)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit ACL entry</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {canDelete && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 p-0"
                          onClick={() => {
                            setDeletingEntryId(params.data.id || null);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete ACL entry</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ),
          },
        ]
        : []),
    ],
    [
      handleTogglePermission,
      handleView,
      handleEditClick,
      canDelete,
      canEdit,
      canView,
    ]
  );

  return (
    <Card className="w-full mt-6 shadow-sm rounded-lg border">
      <CardHeader className="border-b rounded-t-lg bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              ACL Management
            </h1>
            <CardDescription>
              Manage access control lists and permissions for different user
              roles
            </CardDescription>
          </div>
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New ACL Entry</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-xl">
                    {isViewMode
                      ? "ACL Entry Details"
                      : editingEntry
                        ? "Edit ACL Entry"
                        : "Create New ACL Entry"}
                  </DialogTitle>
                  <DialogDescription>
                    {isViewMode
                      ? "View access control permissions for this entry."
                      : editingEntry
                        ? "Update access control permissions for this entry."
                        : "Create a new access control entry with specific permissions."}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow overflow-y-auto my-2">
                  <ACLForm
                    key={`acl-form-${editingEntry?.id || "new"}-${isViewMode ? "view" : "edit"
                      }`}
                    initialData={editingEntry}
                    isViewMode={isViewMode}
                    onSubmit={(data) => {
                      if (editingEntry) {
                        handleUpdate({ ...data, id: editingEntry.id } as Data);
                      } else {
                        handleCreate(data);
                      }
                    }}
                  />
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search ACL entries..."
                className="pl-10"
                aria-label="Search ACL Entries"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setSelectedRole(value as UserRole | "all")
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredEntries?.length || 0} Entries
            </Badge>
          </div>
        </div>

        <SmartLoadingWrapper
          isLoading={loading && (!aclEntries || aclEntries.length === 0)}
          fallback={<TableSkeleton columnDefs={columnDefs} />}
        >
          <div className="rounded-lg overflow-hidden">
            <div ref={tableContainerRef}>
              <TableComponent
                rowData={filteredEntries}
                columnDefs={columnDefs}
                loading={loading}
                key={`acl-table-${JSON.stringify(filteredEntries)}-${currentTheme || "default"
                  }`}
              />
            </div>
          </div>
        </SmartLoadingWrapper>


        <PaginationComponent
          totalPages={pagination.totalPages}
          pageSizeOptions={pagination.pageSizeOptions}
          totalItems={count || 0}
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this ACL entry? This action
                cannot be undone and may affect user access to system features.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 text-sm">
              <p className="font-medium">
                This will permanently remove the access control entry.
              </p>
              <p className="text-muted-foreground mt-1">
                Users with this role may lose access to the specified menu.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deletingEntryId) {
                    handleDelete(deletingEntryId);
                    setDeletingEntryId(null);
                    setIsDeleteDialogOpen(false);
                  }
                }}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

interface ACLFormProps {
  initialData: Data | null;
  onSubmit: (data: Omit<Data, "id">) => void;
  isViewMode?: boolean;
}

function ACLForm({ initialData, onSubmit, isViewMode = false }: ACLFormProps) {
  const getInitialFormData = useCallback((): Omit<Data, "id"> => {
    if (initialData) {
      return {
        menuType: initialData.menuType as MenuType,
        role: initialData.role as UserRole,
        create: initialData.create || false,
        read: initialData.read || false,
        update: initialData.update || false,
        delete: initialData.delete || false,
      };
    }
    return {
      menuType: "MANAGE_USERS",
      role: "user",
      create: false,
      read: false,
      update: false,
      delete: false,
    };
  }, [initialData]);

  const [formData, setFormData] =
    useState<Omit<Data, "id">>(getInitialFormData);

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [getInitialFormData]);

  const handleChange = useCallback(
    (field: keyof Omit<Data, "id">, value: any) => {
      if (!isViewMode) {
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    },
    [isViewMode]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!isViewMode) {
        onSubmit(formData);
      }
    },
    [formData, onSubmit, isViewMode]
  );

  return (
    <div className="px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="menuType" className="text-sm font-medium">
              Menu Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.menuType}
              onValueChange={(value) =>
                handleChange("menuType", value as MenuType)
              }
              disabled={isViewMode}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Menu Type" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "MANAGE_USERS",
                  "CHATBOT",
                  "MANAGE_KNOWLEDGE",
                  "MANAGE_AGENTS",
                  "DASHBOARD",
                  "INVITE_USERS",
                  "MANAGE_ACL",
                  "MANAGE_CREDENTIALS",
                ].map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the menu or feature this ACL entry applies to
            </p>
          </div>

          <div>
            <Label htmlFor="role" className="text-sm font-medium">
              User Role <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleChange("role", value as UserRole)}
              disabled={isViewMode}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the user role this permission set applies to
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Permissions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {["create", "read", "update", "delete"].map((permission) => (
                <div key={permission} className="flex items-center space-x-3">
                  <Switch
                    id={permission}
                    checked={Boolean(
                      formData[permission as keyof typeof formData]
                    )}
                    onCheckedChange={(checked) =>
                      handleChange(permission as keyof typeof formData, checked)
                    }
                    disabled={isViewMode}
                  />
                  <Label htmlFor={permission} className="text-sm font-medium">
                    {permission.charAt(0).toUpperCase() + permission.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enable specific CRUD operations for this role on the selected menu
            </p>
          </div>
        </div>

        {!isViewMode && (
          <DialogFooter className="pt-4 border-t">
            <Button type="submit" className="w-full">
              {initialData ? "Update" : "Create"} ACL Entry
            </Button>
          </DialogFooter>
        )}
      </form>
    </div>
  );
}
