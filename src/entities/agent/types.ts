import { Data as ModelDatasource } from "@/stores/datasource/model";
import { Data as ModelUser } from "@/stores/users/model";
import { VisibilityType } from "@prisma/client";

export class Data {
  id?: string;
  agentName!: string;
  userId?: string;
  description?: string;
  systemInstruction?: string;
  image?: string;
  datasourceId?: string;
  createdAt?: string;
  updatedAt?: string;
  data?: null;
  token?: string;
  datasource?: ModelDatasource | null;
  temperature?: number;
  topK?: number;
  topP?: number;
  model?: string;
  llmModelId?: string;
  visibilityType?: VisibilityType;
  toolsIds?: string[];
  toolsOnAgent?: any[];
  approval_requests?: any[];
  user?: ModelUser;
  imageGenerationEnabled?: boolean;
}

export interface getListParams {
  offset: number;
  limit: number;
  queryParams: Record<string, string>;
}
