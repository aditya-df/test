import React from 'react'
import { FileText } from 'lucide-react'
import EndpointCard from './EndpointCard'

const DocumentEndpoints = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL_V2 || 'https://knowgen-ai-dev.metrodata.web.id/api/v1'

  const uploadFileEndpoint = {
    method: 'POST',
    path: '/document/upload-file/protected/{knowledge_id}',
    title: 'Upload Files',
    description: 'Upload documents to a specific function tool for processing and embedding.',
    auth: true,
    parameters: [
      {
        name: 'knowledge_id',
        type: 'path',
        required: true,
        description: 'The ID of the knowledge to associate documents with'
      }
    ],
    requestBody: {
      type: 'multipart/form-data',
      fields: [
        {
          name: 'files',
          type: 'file[]',
          required: true,
          description: 'Array of files to upload'
        }
      ]
    },
    responses: [
      { code: 200, description: 'Files uploaded successfully' },
      { code: 400, description: 'No files uploaded' },
      { code: 404, description: 'Function tool not found' },
      { code: 500, description: 'Failed to upload files' }
    ],
    example: {
      request: `curl -X POST "${baseUrl}/document/upload-file/protected/cmafo48lb000501noph4eykhq" \\
  -H "Authorization: Bearer <token>" \\
  -F "files=@/path/to/document1.pdf" \\
  -F "files=@/path/to/document2.pdf"`,
      response: `{
  "response_code": 200,
  "response_message": "Files uploaded successfully",
  "data": [
    {
      "id": "doc_id_1",
      "fileName": "document1.pdf",
      "agentId": "agent_id",
      "functionToolId": "knowledge_id",
      "extensionType": "pdf",
      "bucketName": "gcs_path"
    }
  ]
}`
    }
  }

  const pickFromGcsEndpoint = {
    method: 'POST',
    path: '/document/pick-document-from-gcs/{knowledge_id}',
    title: 'Pick Documents from GCS',
    description: 'Import documents from Google Cloud Storage bucket into a function tool.',
    auth: false,
    parameters: [
      {
        name: 'knowledge_id',
        type: 'path',
        required: true,
        description: 'The ID of the knowledge'
      }
    ],
    requestBody: {
      type: 'multipart/form-data',
      fields: [
        {
          name: 'bucket_name',
          type: 'string',
          required: true,
          description: 'GCS bucket name'
        },
        {
          name: 'dir_path',
          type: 'string',
          required: true,
          description: 'Directory path in the bucket'
        },
        {
          name: 'credentials_file',
          type: 'file',
          required: true,
          description: 'GCS service account JSON file'
        }
      ]
    },
    responses: [
      { code: 200, description: 'Request processed successfully' }
    ],
    example: {
      request: `curl -X POST "${baseUrl}/document/pick-document-from-gcs/cmafo48lb000501noph4eykhq" \\
  -F "bucket_name=my_bucket" \\
  -F "dir_path=documents/folder" \\
  -F "credentials_file=@/path/to/service-account.json"`,
      response: `{
  "responseCode": 200,
  "responseMessage": "You're request has been proceed. You can check the status by hitting the endpoint webhook status.",
  "data": null
}`
    }
  }

  const getStatusEndpoint = {
    method: 'GET',
    path: '/document/get-status-pickup-document-from-gcs/{knowledge_id}',
    title: 'Get GCS Pickup Status',
    description: 'Check the status of document pickup from GCS operation.',
    auth: true,
    parameters: [
      {
        name: 'knowledge_id',
        type: 'path',
        required: true,
        description: 'The ID of the knowledge'
      },
      {
        name: 'ordering',
        type: 'query',
        required: false,
        description: 'Sort order (e.g., "-createdAt")'
      }
    ],
    responses: [
      { code: 200, description: 'Status retrieved successfully' },
      { code: 404, description: 'No status found' }
    ],
    example: {
      request: `curl -X GET "${baseUrl}/document/get-status-pickup-document-from-gcs/cmafo48lb000501noph4eykhq?ordering=-createdAt" \\
  -H "Authorization: Bearer <token>"`,
      response: `{
  "response_code": 200,
  "response_message": "success",
  "data": {
    "founds": [
      {
        "id": "job_id",
        "functionToolId": "knowledge_id",
        "status": "COMPLETED",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "search_options": {
      "total_count": 1,
      "page": 1,
      "page_size": 10
    }
  }
}`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Document Endpoints</h2>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Manage document uploads, processing, and integration with Google Cloud Storage for your AI agents.
      </p>

      <EndpointCard endpoint={uploadFileEndpoint} />
      <EndpointCard endpoint={pickFromGcsEndpoint} />
      <EndpointCard endpoint={getStatusEndpoint} />
    </div>
  )
}

export default DocumentEndpoints