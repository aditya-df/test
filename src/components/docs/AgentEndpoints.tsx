import React from 'react'
import { Bot } from 'lucide-react'
import EndpointCard from './EndpointCard'

const AgentEndpoints = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL_V2 || 'https://knowgen-ai-dev.metrodata.web.id/api/v1'

  const getAgentListEndpoint = {
    method: 'GET',
    path: '/agent/list/protected',
    title: 'Get Protected Agent List',
    description: 'Retrieve a paginated list of agents belonging to the authenticated user.',
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
        description: 'Sort field (default: "-createdAt")'
      }
    ],
    responses: [
      { code: 200, description: 'Agents retrieved successfully' }
    ],
    example: {
      request: `curl -X GET "${baseUrl}/agent/list/protected?page=1&page_size=10&ordering=-createdAt" \\
  -H "Authorization: Bearer <token>"`,
      response: `{
  "response_code": 200,
  "response_message": "Success",
  "data": {
    "founds": [
      {
        "id": "agent_id",
        "agentName": "My Agent",
        "description": "Agent description",
        "systemInstruction": "System instructions",
        "userId": "user_id",
        "createdAt": "2024-01-01T00:00:00Z",
        "toolsOnAgent": []
      }
    ],
    "search_options": {
      "total_count": 1,
      "page": 1,
      "page_size": 10,
      "ordering": "-created_at"
    }
  }
}`
    }
  }

  const createAgentEndpoint = {
    method: 'POST',
    path: '/agent/new/protected',
    title: 'Create Protected Agent',
    description: 'Create a new agent for the authenticated user.',
    auth: true,
    requestBody: {
      type: 'application/json',
      fields: [
        {
          name: 'agentName',
          type: 'string',
          required: true,
          description: 'Name of the agent'
        },
        {
          name: 'visibilityType',
          type: 'string',
          required: true,
          description: 'visibility of the agent, can be "public" or "private"',
          enum: ['PUBLIC', 'PRIVATE', 'ORGANIZATION'],
        },
        {
          name: 'systemInstruction',
          type: 'string',
          required: true,
          description: 'Instructions for the agent'
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          description: 'Agent description'
        },
        {
          name: 'toolsIds',
          type: 'string[]',
          required: false,
          description: 'Array of function tool IDs to associate'
        },
        {
          name: 'image',
          type: 'string',
          required: false,
          description: 'Base64 encoded image'
        }
      ]
    },
    responses: [
      { code: 201, description: 'Agent created successfully' },
      { code: 500, description: 'Internal server error' }
    ],
    example: {
      request: `curl -X POST "${baseUrl}/agent/new/protected" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "Testing agent",
    "description": "New testing agent",
    "visibilityType": "PRIVATE",
    "systemInstruction": "new testing instruction"
  }'`,
      response: `{
  "response_code": 201,
  "response_message": "Success",
  "data": {
    "id": "new_agent_id",
    "agentName": "Testing agent",
    "description": "New testing agent",
    "systemInstruction": "new testing instruction",
    "token": "generated_token",
    "userId": "user_id",
    "toolsOnAgent": []
  }
}`
    }
  }

  

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Endpoints</h2>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Create and manage AI agents that can be equipped with various tools and capabilities.
      </p>

      <EndpointCard endpoint={getAgentListEndpoint} />
      <EndpointCard endpoint={createAgentEndpoint} />
    </div>
  )
}

export default AgentEndpoints