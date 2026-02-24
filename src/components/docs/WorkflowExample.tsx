import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, CheckCircle } from 'lucide-react'
import CodeBlock from './CodeBlock'

const WorkflowExample = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL_V2 || 'https://knowgen-ai-dev.metrodata.web.id/api/v1'
  const steps = [
    {
      title: 'Create an Agent',
      description: 'First, create an AI agent that will handle document queries',
      endpoint: 'POST /agent/new/protected',
      code: `curl -X POST "${baseUrl}/agent/new/protected" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "Document Assistant",
    "description": "AI assistant for document queries",
    "visibilityType": "PRIVATE",
    "systemInstruction": "You are a helpful assistant that answers questions based on uploaded documents."
  }'`
    },
    {
      title: 'Create a Knowledge',
      description: 'Create a Knowledge for document processing and embedding',
      endpoint: 'POST /function_tool/new/protected',
      code: `curl -X POST "${baseUrl}/function_tool/new/protected" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "<agent_id_from_step_1>",
    "typeId": "EMBEDDING",
    "name": "Document Knowledge Base",
    "functionName": "search_documents",
    "description": "Search through uploaded documents",
    "systemInstruction": "Search and retrieve relevant information from documents"
  }'`
    },
    {
      title: 'Upload Documents',
      description: 'Upload documents to be processed and embedded',
      endpoint: 'POST /document/upload-file/protected/{function_tool_id}',
      code: `curl -X POST "${baseUrl}/document/upload-file/protected/<function_tool_id>" \\
  -H "Authorization: Bearer <token>" \\
  -F "files=@/path/to/document1.pdf" \\
  -F "files=@/path/to/document2.pdf"`
    },
  //   {
  //     title: 'Query Your Agent',
  //     description: 'Now your agent can answer questions based on the uploaded documents',
  //     endpoint: 'POST /chat/query (example)',
  //     code: `curl -X POST "${baseUrl}/chat/query" \\
  // -H "Authorization: Bearer <token>" \\
  // -H "Content-Type: application/json" \\
  // -d '{
  //   "agent_id": "<agent_id>",
  //   "message": "What are the key points in the uploaded documents?"
  // }'`
  //   }
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Complete Workflow Example
        </CardTitle>
        <CardDescription>
          Follow this step-by-step guide to set up a complete document-based AI assistant
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {step.description}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {step.endpoint}
                    </Badge>
                  </div>
                  <CodeBlock code={step.code} language="bash" />
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex justify-center mt-6">
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default WorkflowExample