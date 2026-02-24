import React from 'react'
import { Wrench } from 'lucide-react'
import EndpointCard from './EndpointCard'

const baseUrl = process.env.NEXT_PUBLIC_API_URL_V2 || 'https://knowgen-ai-dev.metrodata.web.id/api/v1'

const FunctionToolEndpoints = () => {
  const getFunctionToolListEndpoint = {
    method: 'GET',
    path: '/function_tool/list/protected',
    title: 'Get Protected Knowledge List',
    description: 'Retrieve a paginated list of knowledge belonging to the authenticated user.',
    auth: true,
    parameters: [
      {
        name: 'page',
        type: 'query',
        required: false,
        description: 'Page number (default: 1)'
      },
      {
        name: 'page_size',
        type: 'query',
        required: false,
        description: 'Items per page (default: 10)'
      },
      {
        name: 'ordering',
        type: 'query',
        required: false,
        description: 'Sort field (default: "created_at")'
      }
    ],
    responses: [
      { code: 200, description: 'Knowledge retrieved successfully' }
    ],
    example: {
      request: `curl -X GET "${baseUrl}/function_tool/list/protected?page=1&page_size=10&ordering=-createdAt" \\
  -H "Authorization: Bearer <token>"`,
      response: `{
  "response_code": 200,
  "response_message": "Success",
  "data": {
    "founds": [
      {
        "id": "knowledge_id",
        "name": "Document Knowledge",
        "functionName": "get_document_knowledge",
        "description": "Tool description",
        "systemInstruction": "Tool instructions",
        "typeId": "type_id",
        "agentId": "agent_id",
        "userId": "user_id",
        "syncStatus": "COMPLETED",
        "agent": {},
        "type": {},
        "documents": []
      }
    ],
    "search_options": {
      "total_count": 1,
      "page": 1,
      "page_size": 10,
      "ordering": "created_at"
    }
  }
}`
    }
  }

  const createFunctionToolEndpoint = {
    method: 'POST',
    path: '/function_tool/new/protected',
    title: 'Create Protected Knowledge',
    description: 'Create a new knowledge for the authenticated user.',
    auth: true,
    requestBody: {
      type: 'application/json',
      fields: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'ID of the associated agent'
        },
        {
          name: 'typeId',
          type: 'string',
          required: true,
          description: 'Type identifier (e.g., "EMBEDDING", "DATABASE")'
        },
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Knowledge name'
        },
        {
          name: 'functionName',
          type: 'string',
          required: true,
          description: 'System function name for the knowledge with no spaces allowed e.g. get_document_knowledge'
        },
        {
          name: 'description',
          type: 'string',
          required: true,
          description: 'Knowledge description'
        },
        {
          name: 'systemInstruction',
          type: 'string',
          required: true,
          description: 'Instructions for the knowledge'
        }
      ]
    },
    responses: [
      { code: 201, description: 'Knowledge created successfully' },
      { code: 500, description: 'Internal server error' }
    ],
    example: {
      request: `curl -X POST "${baseUrl}/function_tool/new/protected" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "cmb4jl6zc0000xc4gha8mtasb",
    "typeId": "EMBEDDING",
    "name": "document knowledge",
    "functionName": "get_document_knowledge",
    "description": "Your knowledge is about something document",
    "systemInstruction": "You are a helpful assistant"
  }'`,
      response: `{
  "response_code": 201,
  "response_message": "Success",
  "data": {
    "id": "new_knowledge_id",
    "name": "document knowledge",
    "functionName": "get_document_knowledge",
    "description": "Your knowledge is about something document",
    "systemInstruction": "You are a helpful assistant",
    "typeId": "type_parameter_id",
    "agentId": "cmb4jl6zc0000xc4gha8mtasb",
    "userId": "user_id",
    "syncStatus": "COMPLETED"
  }
}`
    }
  }


  
  const assignFunctionToolEndpoint = {
    method: 'POST',
    path: '/function_tool/assign/protected',
    title: 'Assign Knowledge to Agent',
    description: 'Assign existing knowledge to existing agent.',
    auth: true,
    requestBody: {
      type: 'application/json',
      fields: [
        {
          name: 'toolIds',
          type: 'array',
          required: true,
          description: 'IDs of knowledge to assign'
        },
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'ID of the agent to assign knowledge to'
        },
        {
          name: 'isAssigned',
          type: 'boolean',
          required: true,
          description: 'remove or add knowledge to agent, false to remove, true to add'
        },
      ]
    },
    responses: [
      { code: 201, response_message: 'Success', description: 'Knowledge assigned successfully' },
      { code: 500, description: 'Internal server error' }
    ],
    example: {
      request: `curl -X POST "${baseUrl}/function_tool/assign/protected" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "toolIds": ["knowledge_id_1", "knowledge_id_2"],
    "agentId": "agent_id",
    "isAssigned": true
  }'`,
      response: `{
  "response_code": 201,
  "response_message": "Success",
  "data": {
      "toolIds": [
          "knowledge_id_1",
          "knowledge_id_2"
      ],
      "agentId": "agent_id"
  }
}`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Endpoints</h2>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Create and manage knowledge that extend your AI agents with specialized capabilities like document processing, database queries, and custom functions.
      </p>

      <EndpointCard endpoint={getFunctionToolListEndpoint} />
      <EndpointCard endpoint={createFunctionToolEndpoint} />
      <EndpointCard endpoint={assignFunctionToolEndpoint} />
    </div>
  )
}

export default FunctionToolEndpoints
