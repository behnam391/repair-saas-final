-- Phase 1 security: audit log for device-passcode reveals.
-- No foreign keys (mirrors ErrorLog): an audit write must never fail/cascade.

-- CreateTable
CREATE TABLE "PasscodeAccessLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasscodeAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasscodeAccessLog_shopId_createdAt_idx" ON "PasscodeAccessLog"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "PasscodeAccessLog_ticketId_idx" ON "PasscodeAccessLog"("ticketId");
