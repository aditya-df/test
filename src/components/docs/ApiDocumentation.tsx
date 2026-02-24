"use client"
import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OverviewSection from './OverviewSection'
import AuthenticationSection from './AuthenticationSection'
import DocumentEndpoints from './DocumentEndpoints'
import AgentEndpoints from './AgentEndpoints'
import FunctionToolEndpoints from './FunctionToolEndpoints'

const ApiDocumentation = () => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Knowgen API Documentation
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Complete guide to integrate with Knowgen&apos;s AI-powered knowledge management API
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tools">Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewSection />
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <AuthenticationSection />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentEndpoints />
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <AgentEndpoints />
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <FunctionToolEndpoints />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ApiDocumentation