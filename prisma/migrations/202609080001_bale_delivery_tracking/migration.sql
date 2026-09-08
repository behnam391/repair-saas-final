ALTER TABLE "BaleDelivery"
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "providerStatus" INTEGER,
  ADD COLUMN "providerStatusText" TEXT,
  ADD COLUMN "checkedAt" TIMESTAMP(3);
