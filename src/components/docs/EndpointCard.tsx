"use client"
import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Copy, Lock, Unlock } from 'lucide-react'
import CodeBlock from './CodeBlock'

interface Parameter {
  name: string
  type: string
  required: boolean
  description: string
}

interface RequestBodyField {
  name: string
  type: string
  required: boolean
  description: string
}

interface RequestBody {
  type: string
  fields: RequestBodyField[]
}

interface Response {
  code: number
  description: string
}

interface Example {
  request: string
  response: string
}

interface Endpoint {
  method: string
  path: string
  title: string
  description: string
  auth: boolean
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses: Response[]
  example: Example
}

interface EndpointCardProps {
  endpoint: Endpoint
}

const EndpointCard: React.FC<EndpointCardProps> = ({ endpoint }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedRequest, setCopiedRequest] = useState(false)
  const [copiedResponse, setCopiedResponse] = useState(false)

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'POST':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getResponseColor = (code: number) => {
    if (code >= 200 && code < 300) {
      return 'text-green-600 dark:text-green-400'
    } else if (code >= 400 && code < 500) {
      return 'text-yellow-600 dark:text-yellow-400'
    } else if (code >= 500) {
      return 'text-red-600 dark:text-red-400'
    }
    return 'text-gray-600 dark:text-gray-400'
  }

  const copyToClipboard = async (text: string, type: 'request' | 'response') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'request') {
        setCopiedRequest(true)
        setTimeout(() => setCopiedRequest(false), 2000)
      } else {
        setCopiedResponse(true)
        setTimeout(() => setCopiedResponse(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getMethodColor(endpoint.method)}>
              {endpoint.method}
            </Badge>
            <div className="flex items-center gap-2">
              {endpoint.auth ? (
                <Lock className="h-4 w-4 text-yellow-600" />
              ) : (
                <Unlock className="h-4 w-4 text-green-600" />
              )}
              <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                {endpoint.path}
              </span>
            </div>
          </div>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
        <CardTitle className="text-xl">{endpoint.title}</CardTitle>
        <CardDescription>{endpoint.description}</CardDescription>
        {endpoint.auth && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <Lock className="h-4 w-4" />
            <span>Authentication required</span>
          </div>
        )}
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Parameters */}
            {endpoint.parameters && endpoint.parameters.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Parameters</h4>
                <div className="space-y-2">
                  {endpoint.parameters.map((param, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {param.name}
                          </code>
                          <Badge variant={param.required ? 'destructive' : 'secondary'} className="text-xs">
                            {param.required ? 'required' : 'optional'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {param.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{param.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body */}
            {endpoint.requestBody && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Request Body</h4>
                <div className="space-y-3">
                  <Badge variant="outline">{endpoint.requestBody.type}</Badge>
                  <div className="space-y-2">
                    {endpoint.requestBody.fields.map((field, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {field.name}
                            </code>
                            <Badge variant={field.required ? 'destructive' : 'secondary'} className="text-xs">
                              {field.required ? 'required' : 'optional'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{field.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Responses */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Responses</h4>
              <div className="space-y-2">
                {endpoint.responses.map((response, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Badge className={getResponseColor(response.code)}>
                      {response.code}
                    </Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{response.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Examples */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Example</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Request</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint.example.request, 'request')}
                      className="h-8 px-2"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copiedRequest ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <CodeBlock code={endpoint.example.request} language="bash" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">Response</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint.example.response, 'response')}
                      className="h-8 px-2"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copiedResponse ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <CodeBlock code={endpoint.example.response} language="json" />
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default EndpointCard