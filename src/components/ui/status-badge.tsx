import { ApprovalStatus } from "@prisma/client"
import { Badge } from "./badge"
import { cn } from "@/utils/utils";
import { Calendar, CheckCircle, Clock, MinusCircle, XCircle } from "lucide-react";

interface ApprovalStatusBadgeProps {
    status: ApprovalStatus
    className?: string
}

const statusConfig = {
    [ApprovalStatus.PENDING]: {
        label: "Pending",
        icon: Clock,
        className: "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-yellow-200",
    },
    [ApprovalStatus.ACTIVE]: {
        label: "Active",
        icon: CheckCircle,
        className: "bg-green-50 text-green-700 hover:bg-green-50 border-green-200",
    },
    [ApprovalStatus.REJECTED]: {
        label: "Rejected",
        icon: XCircle,
        className: "bg-red-50 text-red-700 hover:bg-red-50 border-red-200",
    },
    [ApprovalStatus.EXPIRED]: {
        label: "Expired",
        icon: Calendar,
        className: "bg-gray-50 text-gray-700 hover:bg-gray-50 border-gray-200",
    },
    [ApprovalStatus.DISABLED]: {
        label: "Disabled",
        icon: MinusCircle,
        className: "bg-slate-50 text-slate-600 hover:bg-slate-50 border-slate-200",
    },
}

export function StatusBadge({ status, className }: ApprovalStatusBadgeProps) {
    const config = statusConfig[status]
    const IconComponent = config.icon

    return (
        <Badge variant="outline" className={cn("font-medium flex items-center gap-1.5", config.className, className)}>
            <IconComponent className="h-3.5 w-3.5" />
            {config.label}
        </Badge>
    )
}

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
    const config = statusConfig[status]
    const IconComponent = config.icon

    return (
        <Badge variant="outline" className={cn("font-medium flex items-center gap-1.5", config.className, className)}>
            <IconComponent className="h-3.5 w-3.5" />
            {config.label}
        </Badge>
    )
}