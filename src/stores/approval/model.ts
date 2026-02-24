import { ApprovalStatus, ProcessName } from "@prisma/client";

export class Data {
  id?: string;
  processName?: ProcessName;
  status?: ApprovalStatus;
  requesterId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  agent?: any;
  requester?: any;
  approvedBy?: any;
  approvedAt?: Date;
}

export class SubmitRequestApproval {
  processName!: ProcessName;
  agentIds!: string[];
}
