import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ApiDocumentation from '@/components/docs/ApiDocumentation'
import WorkflowExample from '@/components/docs/WorkflowExample'
import ErrorHandling from '@/components/docs/ErrorHandling'
import { ContentLayout } from "@/components/dashboard/content-layout";

export default function DocsPage() {
  return (
    <ContentLayout title="API Integration Docs">
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <Tabs defaultValue="api" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="api">API Reference</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="errors">Error Handling</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="api">
            <ApiDocumentation />
          </TabsContent>

          <TabsContent value="workflow">
            <div className="max-w-4xl mx-auto">
              <WorkflowExample />
            </div>
          </TabsContent>

          <TabsContent value="errors">
            <div className="max-w-4xl mx-auto">
              <ErrorHandling />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </ContentLayout>
  )
}