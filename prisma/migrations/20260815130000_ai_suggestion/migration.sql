-- Phase 3 (Intake Helper slice): AI suggestion audit/history.
-- No foreign keys (mirrors ErrorLog/PasscodeAccessLog): an audit write must
-- never fail/cascade. Advisory only — never drives ticket state.

-- CreateTable
CREATE TABLE "AiSuggestion" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "ticketId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "inputSummary" TEXT,
    "output" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSuggestion_shopId_ticketId_idx" ON "AiSuggestion"("shopId", "ticketId");

-- CreateIndex
CREATE INDEX "AiSuggestion_shopId_createdAt_idx" ON "AiSuggestion"("shopId", "createdAt");
