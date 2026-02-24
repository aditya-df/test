import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Bot, Wrench, Shield } from 'lucide-react'

const OverviewSection = () => {
  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Document Management",
      description: "Upload, process, and manage documents with AI-powered embedding",
      endpoints: 3
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "AI Agents",
      description: "Create and manage intelligent agents for various tasks",
      endpoints: 2
    },
    {
      icon: <Wrench className="h-6 w-6" />,
      title: "Knowledge",
      description: "Build custom knowledge and integrate with your agents",
      endpoints: 3
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Access",
      description: "JWT-based authentication for all protected endpoints",
      endpoints: "All"
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Overview</CardTitle>
          <CardDescription>
            The Knowgen API provides powerful endpoints for building AI-powered knowledge management applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                <div className="text-blue-600 dark:text-blue-400">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {feature.description}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {feature.endpoints} endpoint{feature.endpoints !== 1 && feature.endpoints !== "All" ? 's' : ''}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            <strong>Base URL:</strong>
          </p>
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {process.env.NEXT_PUBLIC_API_URL_V2 || 'https://knowgen-ai-dev.metrodata.web.id/api/v1'}
          </code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Format</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            All API responses follow a consistent format:
          </p>
          <div className="bg-gray-900 rounded-lg p-4">
            <pre className="text-green-400 text-sm">
{`{
  "response_code": 200,
  "response_message": "Success message",
  "data": {} // Response data or null
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OverviewSection