import { Data as DataDocument } from "../knowledge/model";
export class Data {
  id?: string;
  name!: string;
  serviceType!: string;
  sourceType!: string;
  type!: string;
  endpoint!: string;
  port!: string;
  uploadedAuthUrl!: string;
  status?: string;
  description?: string;
  tokenGdrive?: string;
  documentIdGdrive?: string[];
  document?: DataDocument[] | [];
  projectId?: string;
  credential?: string;
  databaseBigQuery?: string;
  sqlBigQuery?: string;

  // PostgreSQL specific
  databasePostgres?: string;
  schemaPostgres?: string;
  sqlPostgres?: string;

  // SQL Server specific
  databaseSqlServer?: string;
  schemaSqlServer?: string;
  sqlSqlServer?: string;

  // Elasticsearch specific
  usernameElasticsearch?: string;
  passwordElasticsearch?: string;
  indexElasticsearch?: string;
  queryElasticsearch?: string;

  // Common database fields
  username?: string;
  password?: string;
}
