"use client";

import { Data } from "@/stores/knowledge-new/model";
import { ColDef } from "ag-grid-community";
import { useEffect, useRef, useState, useMemo } from "react";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import TableComponent, {
  TableComponentHandle,
} from "@/components/layouts/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Trash2,
  Edit,
  Calendar,
  Database,
  FileText,
  Server,
  Cpu,
  Bot,
  Building2,
  Lock,
  Globe,
} from "lucide-react";
import { PaginationResult } from "@/hooks/use-pagination-table";
import { PaginationComponent } from "@/components/ui/pagination/pagination-component";
import { useAuth } from "@/utils/auth-utils-client";

// Register only the modules you use
ModuleRegistry.registerModules([ClientSideRowModelModule]);

interface KnowledgeTableProps {
  data: Data[];
  loading: boolean;
  viewAction: (data: any) => void;
  editAction: (data: any) => void;
  deleteAction: (data: any) => void;
  openAssignedAgent: () => void;
  setSelectedAgent: (value: React.SetStateAction<string[]>) => void;
  totalItems: number;
  pagination: PaginationResult;
  canEdit?: boolean;
  canDelete?: boolean;
  canView?: boolean;
}

export const KnowledgeTable = ({
  data,
  loading,
  viewAction,
  editAction,
  deleteAction,
  openAssignedAgent,
  setSelectedAgent,
  totalItems,
  pagination,
  canEdit = true,
  canDelete = true,
  canView = true,
}: KnowledgeTableProps) => {
  const tableRef = useRef<TableComponentHandle>(null);
  const [isTableReady, setIsTableReady] = useState(false);
  const { session } = useAuth();

  // Set table ready after initial render to reduce flickering
  useEffect(() => {
    setIsTableReady(true);
  }, []);

  // Function to get a color based on the type of knowledge
  const getColorForType = (type: string) => {
    switch (type?.toUpperCase()) {
      case "REST API":
        return "bg-blue-100 text-blue-700";
      case "EMBEDDING":
        return "bg-green-100 text-green-700";
      case "BUILT-IN":
        return "bg-purple-100 text-purple-700";
      case "DATABASE":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Function to get an icon based on the type of knowledge
  const getIconForType = (type: string) => {
    switch (type?.toUpperCase()) {
      case "REST API":
        return <Server className="h-4 w-4" />;
      case "EMBEDDING":
        return <FileText className="h-4 w-4" />;
      case "BUILT-IN":
        return <Cpu className="h-4 w-4" />;
      case "DATABASE":
        return <Database className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        // Fix: Access the type value correctly from the nested object
        const type = params.data.type?.valueString || "Unknown";
        const colorClass = getColorForType(type);
        const icon = getIconForType(type);

        return (
          <div className="flex items-center gap-2 py-2">
            <div
              className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}
            >
              {icon}
            </div>
            <div className="font-medium">{params.value || "Unnamed"}</div>
          </div>
        );
      },
    },
    {
      field: "visibilityType",
      headerName: "Visibility",
      width: 120,
      sortable: true,
      filter: true,
      hide: true,
      cellRenderer: (params: any) => {
        // Handle different possible data structures
        let visibilityType = params.value;

        // If params.value is null/undefined, try to get from params.data
        if (!visibilityType && params.data) {
          visibilityType =
            params.data.visibilityType || params.data.visibility_type;
        }

        // Normalize the visibility type to uppercase
        if (typeof visibilityType === "string") {
          visibilityType = visibilityType.toUpperCase();
        }

        // Default to PRIVATE if still no value
        visibilityType = visibilityType || "PRIVATE";

        const visibilityConfig = {
          PRIVATE: {
            label: "Private",
            variant: "outline",
            icon: Lock,
            bgColor: "bg-gray-50 dark:bg-gray-900",
            borderColor: "border-gray-200 dark:border-gray-800",
            textColor: "text-gray-600 dark:text-gray-400",
          },
          ORGANIZATION: {
            label: "Organization",
            variant: "outline",
            icon: Building2,
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            borderColor: "border-blue-200 dark:border-blue-800",
            textColor: "text-blue-600 dark:text-blue-400",
          },
          PUBLIC: {
            label: "Public",
            variant: "outline",
            icon: Globe,
            bgColor: "bg-green-50 dark:bg-green-900/20",
            borderColor: "border-green-200 dark:border-green-800",
            textColor: "text-green-600 dark:text-green-400",
          },
        };

        // Get config with fallback
        const config =
          visibilityConfig[visibilityType as keyof typeof visibilityConfig] ||
          visibilityConfig.PRIVATE;

        return (
          <div className="py-2">
            <Badge
              variant={config.variant as any}
              className={`text-xs flex items-center gap-1 ${config.bgColor} ${config.borderColor} ${config.textColor} border`}
            >
              <config.icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        );
      },
    },
    {
      // Fix: Access agent name correctly from the nested object
      field: "toolsOnAgent",
      headerName: "Assigned Agent",
      width: 160,
      sortable: true,
      filter: true,
      valueGetter: (params: any) => {
        return (params.data.toolsOnAgent || [])
          .map((item: any) => item.agent?.agentName || "Unknown Agent")
          .join(", ");
      },
      cellRenderer: (params: any) => {
        if (
          !params.data.toolsOnAgent ||
          params.data.toolsOnAgent.length === 0
        ) {
          return <div className="text-muted-foreground">No Agent assigned</div>;
        }

        return (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-sm space-x-2"
            onClick={() => {
              setSelectedAgent(
                params.data.toolsOnAgent.map((tool: any) => tool.agentId)
              );
              openAssignedAgent();
            }}
          >
            <Bot className="h-4 w-4" />
            <span>{params.data.toolsOnAgent.length} Agent</span>
          </Button>
        );
      },
    },
    {
      // Fix: Access type correctly from the nested object
      field: "type.valueString",
      headerName: "Type",
      width: 140,
      sortable: true,
      filter: true,
      valueGetter: (params: any) => {
        return params.data.type?.valueString || "Unknown";
      },
      cellRenderer: (params: any) => {
        // Get type from the nested type object
        const type = params.data.type?.valueString || "Unknown";
        const displayType = type === "EMBEDDING" ? "Upload File" : type;
        const colorClass = getColorForType(type);

        return (
          <div className="py-2">
            <Badge className={`${colorClass} border-0`}>{displayType}</Badge>
          </div>
        );
      },
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1.5,
      sortable: true,
      filter: true,
      cellStyle: {
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        overflow: "hidden",
      },
      cellRenderer: (params: any) => {
        return (
          <div className="truncate max-w-md py-2 text-sm">
            {params.value || "No description provided"}
          </div>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 120,
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const date = new Date(params.value || Date.now());
        const formattedDate = date.toLocaleDateString();

        return (
          <div className="flex items-center gap-1 py-2 text-muted-foreground text-xs">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
        );
      },
    },
    {
      field: "user",
      headerName: "Created By",
      width: 150,
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const user = params.value;

        if (!user) {
          return (
            <div className="py-2 text-xs text-muted-foreground">
              Unknown User
            </div>
          );
        }

        return (
          <div className="py-2">
            <div className="text-sm font-medium">{user.name || "No Name"}</div>
            {user.email && (
              <div className="text-xs text-muted-foreground">{user.email}</div>
            )}
          </div>
        );
      },
    },
    {
      field: "syncStatus",
      headerName: "Status",
      width: 100,
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const isCompleted = params.value === "COMPLETED";

        return (
          <div className="py-2">
            <Badge
              variant={isCompleted ? "success" : "secondary"}
              className="text-xs"
            >
              {isCompleted ? "Completed" : "In Progress"}
            </Badge>
          </div>
        );
      },
    },
    {
      headerName: "Actions",
      width: 140,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params: any) => {
        // Check if the current user is the owner of the function tool
        const currentUserId = session?.user?.id;
        const isOwner = params.data.userId === currentUserId;

        return (
          <div className="flex justify-end items-center gap-1 py-2">
            {canView && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      onClick={() => viewAction(params.data)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>View details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {canEdit && isOwner && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:bg-green-50"
                      onClick={() => editAction(params.data)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Edit knowledge</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {canDelete && isOwner && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                      onClick={() => deleteAction(params.data)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Delete knowledge</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
  ], [viewAction, editAction, deleteAction, canView, canEdit, canDelete]);

  // Don't render the table until it's ready to reduce flickering
  if (!isTableReady) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TableComponent
        ref={tableRef}
        rowData={Array.isArray(data) ? data : []}
        columnDefs={columnDefs}
        loading={loading}
      />
      <PaginationComponent
        totalPages={pagination.totalPages}
        pageSizeOptions={pagination.pageSizeOptions}
        totalItems={totalItems}
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setCurrentPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </>
  );
};
