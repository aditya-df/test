import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Key } from "lucide-react";
import CodeBlock from "./CodeBlock";

const AuthenticationSection = () => {
  const authBaseUrl =
    process.env.NEXT_PUBLIC_AUTH_URL ||
    "https://knowgen-ai-dev.metrodata.web.id/api/v1";

  const loginExample = `curl -X POST "${authBaseUrl}/user/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'`;

  const loginExampleEmail = `curl -X POST "${authBaseUrl}/user/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "your_email",
    "password": "your_password"
  }'`;

  const authHeaderExample = `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;

  const loginResponse = `{
  "message": "Login Successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": {
    "id": "70d68181...",
    "username": "username",
    "email": "your_email",
    "isVerified": true
  }
}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Overview
          </CardTitle>
          <CardDescription>
            Knowgen API uses JWT (JSON Web Token) based authentication for
            secure access to protected endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              All protected endpoints require a valid Bearer token in the
              Authorization header.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Login</CardTitle>
          <CardDescription>
            Obtain a JWT token by authenticating with your credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Request (Username):</h4>
            <CodeBlock code={loginExample} language="bash" />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Request (Email):</h4>
            <CodeBlock code={loginExampleEmail} language="bash" />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Response:</h4>
            <CodeBlock code={loginResponse} language="json" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Use Token</CardTitle>
          <CardDescription>
            Include the token in the Authorization header for protected
            endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Header Format:</h4>
            <CodeBlock code={authHeaderExample} language="text" />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Example Request:</h4>
            <CodeBlock
              code={`curl -X GET "${authBaseUrl}/agent/list/protected" \\
  -H "Authorization: Bearer <your_jwt_token>"`}
              language="bash"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-green-600 dark:text-green-400">
                  ✓ Best Practices
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
                  <li>• Store tokens securely</li>
                  <li>• Implement token refresh logic</li>
                  <li>• Handle token expiration</li>
                  <li>• Use HTTPS only</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-red-600 dark:text-red-400">
                  ✗ Avoid
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
                  <li>• Storing tokens in localStorage</li>
                  <li>• Exposing tokens in URLs</li>
                  <li>• Sharing tokens between users</li>
                  <li>• Using expired tokens</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthenticationSection;
