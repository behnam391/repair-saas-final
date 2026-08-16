-- Store-agnostic subscriptions: normalized purchase record with a unique
-- idempotency key (externalRef). Additive; entitlement stays on Shop.

-- CreateTable
CREATE TABLE "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amountToman" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "autoRenewing" BOOLEAN NOT NULL DEFAULT false,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "raw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRecord_externalRef_key" ON "PurchaseRecord"("externalRef");

-- CreateIndex
CREATE INDEX "PurchaseRecord_shopId_createdAt_idx" ON "PurchaseRecord"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRecord_source_status_idx" ON "PurchaseRecord"("source", "status");
