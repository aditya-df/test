import { useStore as useApprovalStore } from "@/stores/approval/useStore";
import { ProcessName, ApprovalStatus } from "@prisma/client";
import { toast } from "../use-toast";

const useApprovalProcess = (handleRefresh?: () => Promise<void>) => {
  const { makeCustomEndpointRequest: submitRequestApproval } =
    useApprovalStore();

  const handleSubmitRequestApproval = async (
    requestedData: string[],
    process: string
  ) => {
    if (!submitRequestApproval) return;

    const requestPayload = {
      processName:
        process == "agent"
          ? ProcessName.APPROVAL_AGENT_ACCESS
          : ProcessName.APPROVAL_KNOWLEDGE_ACCESS,
      agentIds: requestedData,
    };

    try {
      await submitRequestApproval({
        method: "POST",
        path: "create",
        data: requestPayload,
      });
      toast({
        title: "Request Approval",
        description: "Request Approval Success",
      });
    } catch {
      toast({
        title: "Request Approval",
        description: "Request Approval Failed",
        variant: "destructive",
      });
    }
  };

  const handleApproveProcess = async (
    id: string,
    selectedProcess: string,
    remark: string
  ) => {
    if (!submitRequestApproval || !handleRefresh) return;

    const status =
      selectedProcess === "approve"
        ? ApprovalStatus.ACTIVE
        : ApprovalStatus.REJECTED;

    try {
      await submitRequestApproval({
        method: "PUT",
        path: `process/${id}`,
        data: {
          status,
          approveRemark: selectedProcess === "approve" ? remark : "",
          rejectRemark: selectedProcess === "reject" ? remark : "",
        },
      });
      toast({
        title: "Request Approval",
        description: "Request Approval Success",
      });
      handleRefresh();
    } catch {
      toast({
        title: "Request Approval",
        description: "Request Approval Failed",
        variant: "destructive",
      });
    }
  };

  return { handleSubmitRequestApproval, handleApproveProcess };
};

export default useApprovalProcess;
