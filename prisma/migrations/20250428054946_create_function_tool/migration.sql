/*
  Warnings:

  - You are about to drop the column `roomId` on the `ChatNewVersion` table. All the data in the column will be lost.
  - You are about to drop the `AppPackage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppPackageOnOrganization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Chat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatSettingOnOrganization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Integration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IntegrationOnOrganization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MenuType" ADD VALUE 'DASHBOARD';
ALTER TYPE "MenuType" ADD VALUE 'MANAGE_CREDENTIALS';

-- DropForeignKey
ALTER TABLE "AppPackageOnOrganization" DROP CONSTRAINT "AppPackageOnOrganization_appPackageId_fkey";

-- DropForeignKey
ALTER TABLE "AppPackageOnOrganization" DROP CONSTRAINT "AppPackageOnOrganization_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChatHistory" DROP CONSTRAINT "ChatHistory_chatId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSettingOnOrganization" DROP CONSTRAINT "ChatSettingOnOrganization_chatSettingId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSettingOnOrganization" DROP CONSTRAINT "ChatSettingOnOrganization_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "IntegrationOnOrganization" DROP CONSTRAINT "IntegrationOnOrganization_integrationId_fkey";

-- DropForeignKey
ALTER TABLE "IntegrationOnOrganization" DROP CONSTRAINT "IntegrationOnOrganization_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_userId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentHistory" DROP CONSTRAINT "PaymentHistory_userId_fkey";

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "llmModelId" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION,
ADD COLUMN     "topK" INTEGER,
ADD COLUMN     "topP" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ChatNewVersion" DROP COLUMN "roomId",
ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "completionTokens" INTEGER,
ADD COLUMN     "messageResponseTimes" JSONB,
ADD COLUMN     "promptTokens" INTEGER,
ADD COLUMN     "totalResponseTime" INTEGER DEFAULT 0,
ADD COLUMN     "totalTokens" INTEGER;

-- AlterTable
ALTER TABLE "Datasource" ADD COLUMN     "credential" TEXT,
ADD COLUMN     "databaseBigQuery" TEXT,
ADD COLUMN     "databasePostgres" TEXT,
ADD COLUMN     "databaseSqlServer" TEXT,
ADD COLUMN     "indexElasticsearch" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "passwordElasticsearch" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "queryElasticsearch" TEXT,
ADD COLUMN     "schemaPostgres" TEXT,
ADD COLUMN     "schemaSqlServer" TEXT,
ADD COLUMN     "sqlBigQuery" TEXT,
ADD COLUMN     "sqlPostgres" TEXT,
ADD COLUMN     "sqlSqlServer" TEXT,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "usernameElasticsearch" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "functionToolId" TEXT;

-- DropTable
DROP TABLE "AppPackage";

-- DropTable
DROP TABLE "AppPackageOnOrganization";

-- DropTable
DROP TABLE "Chat";

-- DropTable
DROP TABLE "ChatHistory";

-- DropTable
DROP TABLE "ChatSetting";

-- DropTable
DROP TABLE "ChatSettingOnOrganization";

-- DropTable
DROP TABLE "Integration";

-- DropTable
DROP TABLE "IntegrationOnOrganization";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "PaymentHistory";

-- CreateTable
CREATE TABLE "llm_models" (
    "id" TEXT NOT NULL,
    "modelName" TEXT,
    "displayName" TEXT,
    "provider" TEXT,
    "description" TEXT,
    "maxTokens" INTEGER,
    "contextWindow" INTEGER,
    "pricePerToken" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApiKey" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionTool" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "typeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemInstruction" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "executionCode" TEXT,
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunctionTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embeddedChatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbeddedChat" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messages" JSONB NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT NOT NULL,

    CONSTRAINT "EmbeddedChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatNewVersionWebhook" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messages" JSONB NOT NULL,
    "token" TEXT NOT NULL,

    CONSTRAINT "ChatNewVersionWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTimeout" INTEGER DEFAULT 600,
    "warningTime" INTEGER DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parameters" (
    "id" TEXT NOT NULL,
    "keyString" TEXT NOT NULL,
    "valueString" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "credentialFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "llm_models_modelName_key" ON "llm_models"("modelName");

-- CreateIndex
CREATE INDEX "ChatMessage_embeddedChatId_idx" ON "ChatMessage"("embeddedChatId");

-- CreateIndex
CREATE INDEX "ChatMessage_role_idx" ON "ChatMessage"("role");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "EmbeddedChat_agentId_idx" ON "EmbeddedChat"("agentId");

-- CreateIndex
CREATE INDEX "EmbeddedChat_token_idx" ON "EmbeddedChat"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Parameters_keyString_key" ON "Parameters"("keyString");

-- AddForeignKey
ALTER TABLE "ChatNewVersion" ADD CONSTRAINT "ChatNewVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionTool" ADD CONSTRAINT "FunctionTool_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionTool" ADD CONSTRAINT "FunctionTool_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_functionToolId_fkey" FOREIGN KEY ("functionToolId") REFERENCES "FunctionTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_llmModelId_fkey" FOREIGN KEY ("llmModelId") REFERENCES "llm_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_embeddedChatId_fkey" FOREIGN KEY ("embeddedChatId") REFERENCES "EmbeddedChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbeddedChat" ADD CONSTRAINT "EmbeddedChat_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credentials" ADD CONSTRAINT "Credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
