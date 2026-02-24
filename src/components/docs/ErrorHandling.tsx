import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Info } from 'lucide-react'
import CodeBlock from './CodeBlock'

const ErrorHandling = () => {
  const errorCodes = [
    {
      code: 400,
      title: 'Bad Request',
      description: 'The request was invalid or cannot be served',
      example: `{
  "response_code": 400,
  "response_message": "No files uploaded",
  "data": null
}`
    },
    {
      code: 401,
      title: 'Unauthorized',
      description: 'Authentication failed or token is invalid',
      example: `{
  "response_code": 401,
  "response_message": "Invalid or expired token",
  "data": null
}`
    },
    {
      code: 404,
      title: 'Not Found',
      description: 'The requested resource was not found',
      example: `{
  "response_code": 404,
  "response_message": "Function tool not found",
  "data": null
}`
    },
    {
      code: 500,
      title: 'Internal Server Error',
      description: 'An error occurred on the server',
      example: `{
  "response_code": 500,
  "response_message": "Internal Server Error",
  "data": "Error details"
}`
    }
  ]

  const bestPractices = [
    'Always check the response_code field before processing data',
    'Implement proper error handling for network failures',
    'Use exponential backoff for retrying failed requests',
    'Log error responses for debugging purposes',
    'Handle token expiration gracefully with refresh logic'
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Error Handling
          </CardTitle>
          <CardDescription>
            Understanding and handling API errors effectively
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              All API responses include a consistent error format with response_code, response_message, and data fields.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Common Error Codes</h3>
            <div className="grid gap-4">
              {errorCodes.map((error, index) => (
                <Card key={index} className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">{error.code}</span>
                      <CardTitle className="text-base">{error.title}</CardTitle>
                    </div>
                    <CardDescription>{error.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock code={error.example} language="json" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
          <CardDescription>
            Follow these guidelines for robust error handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {bestPractices.map((practice, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{practice}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Error Handler</CardTitle>
          <CardDescription>
            JavaScript example for handling API responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`async function handleApiResponse(response) {
  const data = await response.json();
  
  if (data.response_code >= 200 && data.response_code < 300) {
    // Success
    return data.data;
  } else {
    // Handle different error types
    switch (data.response_code) {
      case 401:
        // Redirect to login or refresh token
        await refreshToken();
        break;
      case 404:
        console.error('Resource not found:', data.response_message);
        break;
      case 500:
        console.error('Server error:', data.response_message);
        // Maybe retry after delay
        break;
      default:
        console.error('API Error:', data.response_message);
    }
    
    throw new Error(data.response_message);
  }
}`}
            language="javascript"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorHandling