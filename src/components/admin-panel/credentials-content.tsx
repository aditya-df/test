"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import TableSkeleton from "../skeleton/table";
import { SmartLoadingWrapper } from "@/components/ui/loading-skeletons/smart-loading-wrapper";
import { Skeleton } from "@/components/ui/loading-skeletons/skeleton-base";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/icons";
import TableComponent from "@/components/layouts/table";
import { useStore } from "@/stores/credential/useStore";
import { Data } from "@/stores/credential/model";
import { Textarea } from "@/components/ui/textarea";
import { ColDef } from "ag-grid-community";
import {
  File,
  X,
  Lock,
  Shield,
  Plus,
  Search,
  Database,
  BookOpen,
  CloudRain,
  Key,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { SubmitLoading } from "@/components/ui/submit-loading";
import { CheckCRUDPermission } from "@/utils/access-check";
import { useDropzoneForCredentials } from "@/utils/dropzone";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Edit, Trash2 } from "lucide-react";
import { usePaginationTable } from "@/hooks/use-pagination-table";
import { PaginationComponent } from "../ui/pagination/pagination-component";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { AddCredentialDialog } from "./add-credential-dialog";

interface CredentialContentProps {

  hasAccess: boolean;
  session?: any;
  MENU_CONST: string;
}

const CREDENTIAL_TYPES = {
  BIGQUERY: "bigquery",
  WIKIPEDIA: "wikipedia",
  WEATHER: "weather",
  GOOGLE_SEARCH: "google_search",
} as const;

type CredentialType = (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES];

// const getCredentialIcon = (credential: Data) => {
//   // Check which type of credential this is based on which fields are populated
//   if (credential.credentialFile) {
//     return Database; // BigQuery
//   } else if (credential.wikipediaAPIKey) {
//     return BookOpen; // Wikipedia
//   } else if (credential.weatherAPIKey) {
//     return CloudRain; // Weather
//   } else if (credential.googleAPIKey && credential.googleCSID) {
//     return Search; // Google Search
//   }
//   // Default icon if type cannot be determined
//   return Key;
// };

const getCredentialType = (credential: Data) => {
  if (credential.credentialFile) {
    return "BigQuery";
  } else if (credential.wikipediaAPIKey) {
    return "Wikipedia API";
  } else if (credential.weatherAPIKey) {
    return "Weather API";
  } else if (credential.googleAPIKey && credential.googleCSID) {
    return "Google Search API";
  } else if (credential.googleAPIKey) {
    return "Google API";
  }
  return "Unknown";
};

const getColorForType = (credential: Data) => {
  if (credential.credentialFile) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400";
  } else if (credential.wikipediaAPIKey) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
  } else if (credential.weatherAPIKey) {
    return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
  } else if (credential.googleAPIKey && credential.googleCSID) {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400";
  } else if (credential.googleAPIKey) {
    return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

// Function to get an icon based on the type of credential
const getIconForType = (credential: Data) => {
  // Check which type of credential this is based on which fields are populated
  if (credential.credentialFile) {
    return Database; // BigQuery
  } else if (credential.wikipediaAPIKey) {
    return BookOpen; // Wikipedia
  } else if (credential.weatherAPIKey) {
    return CloudRain; // Weather
  } else if (credential.googleAPIKey && credential.googleCSID) {
    return Search; // Google Search
  }
  // Default icon if type cannot be determined
  return Key;
};

const getTypeColorForBadge = (type: string) => {
  switch (type) {
    case "BigQuery":
      return "bg-orange-100 text-orange-800 border-orange-200"; // Changed from blue to orange
    case "Wikipedia API":
      return "bg-blue-100 text-blue-800 border-blue-200"; // Keep blue
    case "Weather API":
      return "bg-green-100 text-green-800 border-green-200"; // Changed from orange to green
    case "Google Search API":
      return "bg-purple-100 text-purple-800 border-purple-200"; // Keep purple
    case "Google API":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"; // Keep indigo
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function CredentialsContent({
  hasAccess,
  session,
  MENU_CONST,
}: CredentialContentProps) {
  const router = useRouter();

  const canEdit = CheckCRUDPermission(session, MENU_CONST, "update");
  const canDelete = CheckCRUDPermission(session, MENU_CONST, "delete");
  const canCreate = CheckCRUDPermission(session, MENU_CONST, "create");
  const canView = CheckCRUDPermission(session, MENU_CONST, "read");

  const hasValidAccess = hasAccess && canView;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const searchParams = useSearchParams();

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
                You don&apos;t have the necessary permissions to view
                Credentials. Please contact your administrator if you believe
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

  const { toast } = useToast();
  const store = useStore();
  const { data, loading, error, errorData, count } = store;

  // Add local state for credentials data
  const [credentials, setCredentials] = useState<Data[]>(data || []);

  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [credential, setCredential] = useState<Data>(new Data());
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // NEW: Add Credential Dialog state
  const [showAddCredentialDialog, setShowAddCredentialDialog] = useState(false);
  const [preselectedCredentialType, setPreselectedCredentialType] =
    useState<CredentialType | null>(null);

  const [credentialToDelete, setCredentialToDelete] = useState<Data | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const pagination = usePaginationTable({ totalItems: count || 0 });

  // Sync store data with local state
  useEffect(() => {
    if (data) {
      setCredentials(data);
    }
  }, [data]);

  const {
    dragActive,
    inputRef,
    files,
    setFiles,
    handleChange,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    openFileExplorer,
  } = useDropzoneForCredentials(credential, setCredential);

  // Fix by wrapping it in useCallback:
  const loadData = useCallback(() => {
    store.getList({
      offset: ((pagination.currentPage - 1) * pagination.pageSize),
      limit: pagination.pageSize,
    });
  }, [pagination.currentPage, pagination.pageSize]);

  // Add this useEffect to handle auto-opening credential creation dialog
  useEffect(() => {
    const createParam = searchParams.get("create");

    if (createParam && canCreate) {
      // Map the credential type to your internal types
      const credentialTypeMapping = {
        wikipedia: CREDENTIAL_TYPES.WIKIPEDIA,
        weather: CREDENTIAL_TYPES.WEATHER,
        google_search: CREDENTIAL_TYPES.GOOGLE_SEARCH,
        bigquery: CREDENTIAL_TYPES.BIGQUERY,
      };

      const mappedType =
        credentialTypeMapping[
          createParam as keyof typeof credentialTypeMapping
        ];

      if (mappedType) {
        // Auto-open the credential creation dialog with the specified type
        setTimeout(() => {
          setPreselectedCredentialType(mappedType);
          setShowAddCredentialDialog(true);

          // Show informational toast
          toast({
            title: "Create Required Credentials",
            description: `Please create ${createParam} credentials to continue with your knowledge setup.`,
          });
        }, 500); // Small delay to ensure component is fully loaded
      }

      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("create");
      newUrl.searchParams.delete("return");
      window.history.replaceState(
        {},
        document.title,
        newUrl.pathname + newUrl.search
      );
    }
  }, [searchParams, canCreate]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter credentials based on search query
  const filteredCredentials = searchQuery
    ? credentials?.filter(
        (credential) =>
          credential.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          credential.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : credentials;

  const columnDefs: ColDef[] = [
    {
      field: "name",
      headerName: "Name",
      filter: true,
      sortable: true,
      minWidth: 150,
      flex: 1,
      cellRenderer: (props: any) => {
        const Icon = getIconForType(props.data);
        const colorClass = getColorForType(props.data);

        return (
          <div className="flex items-center gap-3 py-2">
            <div
              className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-medium">{props.value}</span>
          </div>
        );
      },
    },
    {
      field: "description",
      headerName: "Description",
      filter: true,
      sortable: true,
      minWidth: 200,
    },
    {
      field: "credentialType",
      headerName: "Credential Type",
      valueGetter: (params: any) => getCredentialType(params.data),
      cellRenderer: (props: any) => {
        const credentialType = getCredentialType(props.data);

        return (
          <div className="flex items-center gap-2 py-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTypeColorForBadge(
                credentialType
              )}`}
            >
              {credentialType}
            </span>
          </div>
        );
      },
      minWidth: 180,
      filter: true,
      sortable: true,
    },
    ...(canEdit || canDelete
      ? [
          {
            field: "action",
            headerName: "Action",
            cellRenderer: (props: any) => {
              return (
                <div className="flex justify-end items-center gap-1 py-2 pr-3">
                  {canView && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleView(props.data)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>View credential details</p>
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
                            className="h-8 w-8 text-green-600 hover:bg-green-50"
                            onClick={() => handleEdit(props.data)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit credential</p>
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
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(props.data)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete credential</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const handleView = async (data: Data) => {
    if (!data?.id) return;

    try {
      setIsSubmitting(true);
      const response = await store.getDetail(data.id);

      if (!response) {
        throw new Error("Failed to load credential details");
      }

      setCredential(response);

      // Handle existing credential file
      if (response.credentialFile) {
        const fileObject = {
          name: response.credentialFile,
        } as File;

        setFiles([fileObject]);
      }

      setIsEdit(false);
      setIsViewMode(true);
      setIsOpen(true);
    } catch (error) {
      console.error("Error in handleView:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load credential details.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Updated add credential handler (opens new dialog)
  const handleAddCredential = () => {
    setPreselectedCredentialType(null);
    setShowAddCredentialDialog(true);
  };

  const handleDeleteClick = (data: Data) => {
    setCredentialToDelete(data);
    setDeleteDialogOpen(true);
  };

  const handleEdit = async (data: Data) => {
    if (!data?.id) return;

    try {
      setIsSubmitting(true);
      const response = await store.getDetail(data.id);

      if (!response) {
        throw new Error("Failed to load credential details");
      }

      setCredential(response);

      // Handle existing credential file
      if (response.credentialFile) {
        const fileObject = {
          name: response.credentialFile,
          type: "application/json",
          size: 0,
          lastModified: new Date(response.updatedAt || "").getTime(),
          webkitRelativePath: "",
          arrayBuffer: async () => new ArrayBuffer(0),
          slice: () => new Blob([]),
          stream: () => new ReadableStream(),
          text: async () => "",
        } as File;

        setFiles([fileObject]);
      }

      setIsEdit(true);
      setIsOpen(true);
    } catch (error) {
      console.error("Error in handleEdit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load credential details. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (data: Data) => {
    setIsSubmitting(true);
    try {
      await store.delete(data.id || "");
      setDeleteDialogOpen(false);
      loadData();
      toast({
        title: "Success",
        description: "Credential deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete credential",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!credential.name) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const credentialData: Data = {
        ...credential,
        name: credential.name,
        description: credential.description || "",
        credentialFile: files[0] || "",
        wikipediaAPIKey: credential.wikipediaAPIKey || null,
        weatherAPIKey: credential.weatherAPIKey || null,
        googleAPIKey: credential.googleAPIKey || null,
        googleCSID: credential.googleCSID || null,
      };

      if (isEdit) {
        await store.update(credentialData);
      } else {
        await store.create(credentialData);
      }

      setIsOpen(false);
      setCredential(new Data());
      loadData();

      toast({
        title: "Success",
        description: `Credential ${
          isEdit ? "updated" : "created"
        } successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save credential",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Handle credential created from dialog
  const handleCredentialCreated = () => {
    loadData(); // Refresh the list
    toast({
      title: "Success",
      description: "Credential created successfully",
    });
  };

  // Dialog close handler for edit/view dialogs
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
      setIsViewMode(false);
      setIsEdit(false);
      setCredential(new Data());
      setFiles([]);
    }
  };

  // Get dialog header for edit/view mode
  const getDialogHeader = () => {
    const getCredentialIconAndLabel = () => {
      if (isEdit || isViewMode) {
        if (credential.credentialFile) {
          return { icon: Database, label: "Google BigQuery" };
        } else if (credential.wikipediaAPIKey) {
          return { icon: BookOpen, label: "Wikipedia API" };
        } else if (credential.weatherAPIKey) {
          return { icon: CloudRain, label: "Weather API" };
        } else if (credential.googleAPIKey && credential.googleCSID) {
          return { icon: Search, label: "Google Search API" };
        }
      }
      return { icon: Key, label: "Credential" };
    };

    const { icon: CredentialIcon, label: credentialLabel } =
      getCredentialIconAndLabel();

    return (
      <>
        <DialogTitle className="flex items-center gap-2">
          <CredentialIcon className="h-5 w-5" />
          {isViewMode
            ? `${credentialLabel} Details`
            : `Edit ${credentialLabel}`}
        </DialogTitle>
        <DialogDescription>
          {isViewMode
            ? `View your ${credentialLabel.toLowerCase()} details.`
            : `Update your ${credentialLabel.toLowerCase()} details.`}
        </DialogDescription>
      </>
    );
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: `Ups something went wrong!`,
        description: errorData?.message || "Please try again later.",
      });
    }
  }, [error, errorData, toast]);

  return (
    <Card className="w-full mt-6 shadow-sm rounded-lg border">
      {isSubmitting && <SubmitLoading />}
      <CardHeader className="border-b rounded-t-lg bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Key className="h-5 w-5" />
              Google Cloud Credentials
            </h1>
            <CardDescription>
              Manage your Google Cloud Platform service account credentials
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button
                onClick={handleAddCredential}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Credential</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search credentials..."
              className="pl-10"
              aria-label="Search Credentials"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredCredentials?.length || 0} Credentials
            </Badge>
          </div>
        </div>

        <SmartLoadingWrapper
          isLoading={loading && !filteredCredentials?.length}
          fallback={<TableSkeleton columnDefs={columnDefs} />}
        >
          <div ref={tableContainerRef}>
            <TableComponent
              loading={loading}
              rowData={filteredCredentials}
              columnDefs={columnDefs}
              key={JSON.stringify(filteredCredentials)}
            />
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

        {/* NEW: Add Credential Dialog */}
        <AddCredentialDialog
          isOpen={showAddCredentialDialog}
          onOpenChange={setShowAddCredentialDialog}
          preselectedType={preselectedCredentialType}
          contextInfo={{
            isFromKnowledge:
              searchParams.get("return")?.includes("knowledge") || false,
            requiredFor: preselectedCredentialType?.replace("_", " ") || "",
          }}
          onCredentialCreated={handleCredentialCreated}
        />

        {/* Edit/View Dialog - existing dialog for editing and viewing */}
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>{getDialogHeader()}</DialogHeader>

            <div className="py-4 space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Name</Label>
                  <Input
                    className="col-span-3"
                    value={credential.name}
                    onChange={(e) =>
                      !isViewMode &&
                      setCredential({ ...credential, name: e.target.value })
                    }
                    placeholder="Credential name"
                    readOnly={isViewMode}
                  />
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right">Description</Label>
                  <Textarea
                    className="col-span-3"
                    value={credential.description}
                    onChange={(e) =>
                      !isViewMode &&
                      setCredential({
                        ...credential,
                        description: e.target.value,
                      })
                    }
                    placeholder="Credential description"
                    readOnly={isViewMode}
                  />
                </div>

                {/* Show appropriate fields based on credential type */}
                {credential.wikipediaAPIKey && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">User Agent</Label>
                    <Input
                      className="col-span-3"
                      value={credential.wikipediaAPIKey || ""}
                      onChange={(e) =>
                        !isViewMode &&
                        setCredential({
                          ...credential,
                          wikipediaAPIKey: e.target.value || null,
                        })
                      }
                      placeholder="Wikipedia API User Agent"
                      readOnly={isViewMode}
                    />
                  </div>
                )}

                {credential.weatherAPIKey && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">API Key</Label>
                    <Input
                      className="col-span-3"
                      value={credential.weatherAPIKey || ""}
                      onChange={(e) =>
                        !isViewMode &&
                        setCredential({
                          ...credential,
                          weatherAPIKey: e.target.value || null,
                        })
                      }
                      placeholder="Weather API Key"
                      readOnly={isViewMode}
                    />
                  </div>
                )}

                {credential.googleAPIKey && credential.googleCSID && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">API Key</Label>
                      <Input
                        className="col-span-3"
                        value={credential.googleAPIKey || ""}
                        onChange={(e) =>
                          !isViewMode &&
                          setCredential({
                            ...credential,
                            googleAPIKey: e.target.value || null,
                          })
                        }
                        placeholder="Google API Key"
                        readOnly={isViewMode}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Search Engine ID</Label>
                      <Input
                        className="col-span-3"
                        value={credential.googleCSID || ""}
                        onChange={(e) =>
                          !isViewMode &&
                          setCredential({
                            ...credential,
                            googleCSID: e.target.value || null,
                          })
                        }
                        placeholder="Custom Search Engine ID"
                        readOnly={isViewMode}
                      />
                    </div>
                  </>
                )}

                {credential.credentialFile && (
                  <div className="grid items-start grid-cols-4 gap-4">
                    <Label htmlFor="name" className="text-right">
                      {isViewMode
                        ? "Credential File"
                        : "Edit Credentials Files"}
                    </Label>

                    {isViewMode ? (
                      // View mode - Read-only display of files
                      <div className="col-span-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        {files && files.length > 0 ? (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                              Credential File
                            </h3>
                            <ul className="space-y-2">
                              {files.map((file: any, index: any) => (
                                <li
                                  key={index}
                                  className="flex items-center p-2 bg-white rounded border border-gray-100"
                                >
                                  <File className="h-5 w-5 text-primary mr-2" />
                                  <span className="text-sm text-gray-700">
                                    {file.name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 py-4 text-center">
                            No credential file uploaded
                          </div>
                        )}
                      </div>
                    ) : (
                      // Edit mode - Full form with drag & drop
                      <form
                        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors col-span-3 ${
                          dragActive
                            ? "border-primary bg-primary/10"
                            : "border-gray-300 hover:border-primary"
                        } text-center flex flex-col items-center justify-center`}
                        onDragEnter={handleDragEnter}
                        onSubmit={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                      >
                        <input
                          placeholder="fileInput"
                          className="hidden"
                          ref={inputRef}
                          type="file"
                          multiple={false}
                          onChange={handleChange}
                          accept=".json"
                        />

                        <p>
                          Drag & Drop file or{" "}
                          <span
                            className="font-bold text-blue-600 cursor-pointer"
                            onClick={openFileExplorer}
                          >
                            <u>Select file</u>
                          </span>{" "}
                          to upload
                        </p>
                        <div className="flex flex-col items-center p-3">
                          {files && files.length > 0 && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold mb-2">
                                Uploaded Files
                              </h3>
                              <ul className="space-y-2">
                                {files.map((file: any, index: any) => (
                                  <li
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                  >
                                    <div className="flex items-center">
                                      <File className="h-5 w-5 text-primary mr-2" />
                                      <span className="text-sm text-gray-700">
                                        {file.name}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => removeFile("", index)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-5 w-5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>
              {!isViewMode && (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog remains separate */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the credential &quot;
                {credentialToDelete?.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(credentialToDelete!)}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
      <Toaster />
    </Card>
  );
}
