"use client";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Check, RefreshCw, Search } from "lucide-react";
import { useStore } from "@/stores/approval/useStore";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalAgentTable } from "./approval-agent-table";
import useApprovalProcess from "@/hooks/approval/use-approval-process";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore as useAgentStore } from "@/stores/agent/useStore";
import { AvatarPreview } from "../agent/agent-avatar";
import { usePaginationTable } from "@/hooks/use-pagination-table";

interface ApprovalRequestAgentComponentProps {
    process: string;
}

export const ApprovalRequestAgentComponent = ({ process }: ApprovalRequestAgentComponentProps) => {
    const { getList, data, loading, count } = useStore();
    const { getDetail, selectedData: agent } = useAgentStore();
    const [isOpenAgentInfo, setIsOpenAgentInfo] = useState(false)
    const pagination = usePaginationTable({ totalItems: count || 0 })

    const fetchData = useCallback(async () => {
        await getList({ offset: pagination.currentPage, limit: pagination.pageSize });
    }, [pagination.currentPage, pagination.pageSize]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    const onOpenAgentInfo = async (agentId: string) => {
        await getDetail(agentId)
        setIsOpenAgentInfo(true)
    }


    const { handleApproveProcess } = useApprovalProcess(handleRefresh)

    return (
        <Card className="w-full mt-6 shadow-sm rounded-lg border">
            <CardHeader className="border-b rounded-t-lg bg-gray-50 dark:bg-zinc-950">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Check className="h-5 w-5" />
                            Approval Management
                        </h1>
                        <CardDescription>
                            Manage incoming approval request for {process}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* For action Button */}
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
                                value=""
                                onChange={() => { }}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="h-9 w-9 flex-shrink-0 rounded-lg"
                            title="Refresh agent list"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {data?.length || 0} Approval Requests
                        </Badge>
                    </div>
                </div>

                {loading && !data?.length ? (
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4">
                        <ApprovalAgentTable
                            data={data || []}
                            loading={loading}
                            handleApproveProcess={handleApproveProcess}
                            onOpenAgentInfo={onOpenAgentInfo}
                            totalItems={count || 0}
                            pagination={pagination}
                        />
                    </div>
                )}

            </CardContent>

            <Dialog open={isOpenAgentInfo} onOpenChange={setIsOpenAgentInfo}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex flex-col items-center gap-4 text-center">
                            <AvatarPreview avatarId={agent?.image} />
                            <div>
                                <div className="font-semibold text-lg">{agent?.agentName}</div>
                                <div className="text-sm text-gray-600 mt-1">{agent?.description}</div>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </Card>
    )
}