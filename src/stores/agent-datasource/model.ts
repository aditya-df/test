import { DocumentOnOrganization } from "@prisma/client";

export class Data {
  id!: string;
  agentId!: string;
  fileName!: string;
  bucketName?: string;
  description?: string;
  extensionType?: string;
  documentOnOrganization!: DocumentOnOrganization;
  createdAt?: string;
  updatedAt?: string;
}
