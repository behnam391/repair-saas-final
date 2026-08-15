-- AI provider management: additive AI config columns on PlatformSettings, and
-- an audit table for Super Admin AI-config changes. All columns are nullable
-- (safe on existing rows). API keys are stored encrypted (see lib/crypto).

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN "aiEnabled" BOOLEAN;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiProvider" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiBaseUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiApiKey" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiFallbackProvider" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiFallbackBaseUrl" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiFallbackApiKey" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiFallbackModel" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiTimeoutMs" INTEGER;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiMaxRetries" INTEGER;
ALTER TABLE "PlatformSettings" ADD COLUMN "aiShopDailyLimit" INTEGER;

-- CreateTable
CREATE TABLE "AiConfigAudit" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "changedFields" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiConfigAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConfigAudit_createdAt_idx" ON "AiConfigAudit"("createdAt");
