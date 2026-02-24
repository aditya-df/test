import { ColDef, ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";
import { Data } from "@/stores/approval/model";
import TableComponent, {
    TableComponentHandle,
} from "@/components/layouts/table";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle, CheckCircle, Bot, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PaginationResult } from "@/hooks/use-pagination-table";
import { PaginationComponent } from "@/components/ui/pagination/pagination-component";
import { ApprovalStatusBadge } from "@/components/ui/status-badge";
import { ApprovalStatus } from "@prisma/client";

// Register only the modules you use
ModuleRegistry.registerModules([ClientSideRowModelModule]);

interface ApprovalAgentTableProps {
    data: Data[];
    loading: boolean;
    handleApproveProcess: (id: string, selectedProcess: string, remark: string) => Promise<void>;
    onOpenAgentInfo: (agentId: string) => void;
    totalItems: number;
    pagination: PaginationResult
}

export const ApprovalAgentTable = ({ data, loading, handleApproveProcess, onOpenAgentInfo, totalItems, pagination }: ApprovalAgentTableProps) => {
    const tableRef = useRef<TableComponentHandle>(null);
    const [isUpdating] = useState(false);
    const [isOpenApprovalProcess, setIsOpenApprovalProcess] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState<string>("");
    const [selectedId, setSelectedId] = useState<string>("");
    const [remark, setRemark] = useState("");
    const [isApprovalLoading, setIsApprovalLoading] = useState(false)

    const onApprove = (id: string, processName: string) => {
        setSelectedId(id);
        setSelectedProcess(processName);
        setIsOpenApprovalProcess(true);
    };

    const onReject = (id: string, processName: string) => {
        setSelectedId(id);
        setSelectedProcess(processName);
        setIsOpenApprovalProcess(true);
    };

    const handleSubmit = async () => {
        setIsApprovalLoading(true)
        await handleApproveProcess(selectedId, selectedProcess, remark)
        setIsApprovalLoading(false)
        setIsOpenApprovalProcess(false)
        setRemark("")
    };

    const columnDefs = useMemo<ColDef[]>(() => [
        {
            headerName: "Process Name",
            field: "processName",
            flex: 1,
            width: 180,
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => (
                <div className="text-sm font-medium">{params.value.replace(/_/g, " ")}</div>
            ),
        },
        {
            headerName: "Agent",
            field: "agent",
            width: 150,
            flex: 1,
            cellRenderer: (params: any) => {
                // Add proper null checking to handle undefined values
                if (!params.value || !params.value[0]) {
                    return <div className="text-sm text-muted-foreground">No agent data</div>;
                }
                
                const agentName = params.value[0].agentName;
                const agentId = params.value[0].id;
                
                return (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => onOpenAgentInfo(agentId)}>
                        <Bot className="h-4 w-4" />
                        {agentName || "Unnamed Agent"}
                    </Button>
                )
            },
        },
        {
            headerName: "Requester",
            field: "requester",
            flex: 1,
            cellRenderer: (params: any) => {
                const user = params.value;
                return (
                    <div className="py-2">
                        <div className="text-sm font-medium">
                            {user.name || "No Name"}
                        </div>
                        {user.email && (
                            <div className="text-xs text-muted-foreground">
                                {user.email}
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            headerName: "Approved By",
            field: "approvedBy",
            flex: 1,
            cellRenderer: (params: any) => {
                const user = params.value;
                if (user) {
                    return (
                        <div className="py-2">
                            <div className="text-sm font-medium">
                                {user.name || "No Name"}
                            </div>
                            {user.email && (
                                <div className="text-xs text-muted-foreground">
                                    {user.email}
                                </div>
                            )}
                        </div>
                    )
                } else {
                    return (
                        <div className="py-2">
                            <div className="text-sm font-medium">
                                -
                            </div>
                        </div>
                    )
                }
            },
        },
        {
            headerName: "Status",
            field: "status",
            flex: 1,
            cellRenderer: (params: any) => (
                <ApprovalStatusBadge status={params.value as ApprovalStatus} />
            ),
        },
        {
            headerName: "Requested At",
            field: "createdAt",
            flex: 1,
            valueFormatter: (params: any) =>
                params.value ? new Date(params.value).toLocaleString() : "-",
        },
        {
            headerName: "Action",
            flex: 1,
            cellRenderer: (params: any) => {
                const data = params.data;
                // Only show action buttons if status is PENDING
                if (data.status !== "PENDING") {
                    return null;
                }
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => onApprove(data.id, "approve")}
                            disabled={isUpdating}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onReject(data.id, "reject")}
                            disabled={isUpdating}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        }
    ], [isUpdating]);

    return (
        <>
            <TableComponent
                ref={tableRef}
                columnDefs={columnDefs}
                rowData={data}
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

            <Dialog open={isOpenApprovalProcess} onOpenChange={setIsOpenApprovalProcess}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            {selectedProcess === "approve" ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                            {selectedProcess === "approve" ? "Approve Request" : "Reject Request"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedProcess === "approve"
                                ? "Are you sure you want to approve this request? You can add an optional remark below."
                                : "Are you sure you want to reject this request? Please provide a reason for rejection."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="remark" className="text-sm font-medium">
                            {selectedProcess === "approve" ? "Approval Remark (Optional)" : "Rejection Reason (Required)"}
                        </Label>
                        <Textarea
                            id="remark"
                            placeholder={selectedProcess === "approve"
                                ? "Add any additional notes about this approval..."
                                : "Please provide a reason for rejecting this request..."}
                            className="mt-2"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsOpenApprovalProcess(false);
                                setRemark("");
                            }}
                            disabled={isApprovalLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={selectedProcess === "approve" ? "default" : "destructive"}
                            onClick={handleSubmit}
                            disabled={isUpdating || (selectedProcess === "reject" && !remark.trim()) || isApprovalLoading}
                        >
                            {isApprovalLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                selectedProcess === "approve" ? "Approve Request" : "Reject Request"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};