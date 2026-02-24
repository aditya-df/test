import { VisibilityType } from "@prisma/client";

export class Data {
  id?: string;
  agentId?: string;
  typeId?: string;
  name?: string;
  functionName?: string;
  description?: string;
  systemInstruction?: string;
  parameters?: any;
  executionCode?: string;
  syncStatus?: string;
  documents?: any[];
  agent?: any;
  type?: any;
  databaseType?: string;
  databaseZone?: string;
  datasetId?: string;
  sqlCommand?: string;
  credentialsJson?: string;
  credentialId?: string;
  requestMethod?: string;
  requestUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  visibilityType?: VisibilityType;
  current_files?: string[];
  userId?: string;
  user?: any;
  toolsOnAgent?: any[];
}

export class DataSubmit {
  id?: string;
  files?: File[];
  current_files?: string[];
  current_credentials?: string | null;
  agent_id?: string;
  type_id?: string;
  name?: string;
  description?: string;
  system_instruction?: string;
  function_name?: string;
  parameters?: any;
  execution_code?: string;
  database_type?: string;
  credential_file?: File | null;
  credential_id?: string;
  sql_command?: string;
  visibility_type?: VisibilityType;
  selected_credential_id?: string;
  selected_wikipedia_credential_id?: string;
  selected_weather_credential_id?: string;
  selected_google_credential_id?: string;
  database_zone?: string;
  dataset_id?: string;
  request_method?: string;
  request_url?: string;
}

export class DataBuiltInKey {
  id!: string;
  key!: string;
  value!: string;
}

export class BaseDataRestAPI {
  id?: string;
  key?: string;
  value?: string;
  required?: boolean;
}
export class DataRequestRestApi extends BaseDataRestAPI {
  send_in?: "inBody" | "inQuery" | "inHeader";
}
export class DataHeaderRestApi extends BaseDataRestAPI {
  is_secure?: boolean;
  is_enabled?: boolean;
}

export class DataAuthRestApi {
  type?: string;
  bearer_token?: string;
  api_key?: string;
  key_name?: string;
  key_location?: string;
  username?: string;
  password?: string;
  is_get_from_function?: boolean;
  connection_id?: string;
}

export class DataOAuth2 {
  name?: string;
  grantType?: string;
  callbackUrl?: string;
  authUrl?: string;
  accessTokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  state?: string;
  clientAuth?: string;
  refreshUrl?: string;
  authRequest?: DataRequestRestApi[];
  tokenRequest?: DataRequestRestApi[];
  refreshRequest?: DataRequestRestApi[];
}

export class DataConfigRestApi {
  timeout?: number;
}
