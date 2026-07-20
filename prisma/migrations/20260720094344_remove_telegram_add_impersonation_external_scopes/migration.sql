/*
  Warnings:

  - You are about to drop the column `telegramBotToken` on the `PlatformSettings` table. All the data in the column will be lost.
  - You are about to drop the column `telegramBotUsername` on the `PlatformSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyTelegram` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `telegramId` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DealerStockStatus" AS ENUM ('IN_STOCK', 'SOLD');

-- AlterTable
ALTER TABLE "ExternalApiKey" ADD COLUMN     "scopes" TEXT NOT NULL DEFAULT 'device_flags,device_transactions';

-- AlterTable
ALTER TABLE "PendingIntake" ADD COLUMN     "devicePasscode" TEXT,
ADD COLUMN     "devicePasscodeType" TEXT;

-- AlterTable
ALTER TABLE "PlatformSettings" DROP COLUMN "telegramBotToken",
DROP COLUMN "telegramBotUsername";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "notifyTelegram",
DROP COLUMN "telegramId";

-- CreateTable
CREATE TABLE "DealerInventory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "imei" TEXT,
    "deviceModel" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'WORKING',
    "purchasePrice" INTEGER NOT NULL,
    "askingPrice" INTEGER,
    "sourceName" TEXT,
    "sourcePhone" TEXT,
    "status" "DealerStockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "soldPrice" INTEGER,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "notes" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "DealerInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpersonationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealerInventory_shopId_status_idx" ON "DealerInventory"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ImpersonationToken_token_key" ON "ImpersonationToken"("token");

-- CreateIndex
CREATE INDEX "ImpersonationToken_userId_idx" ON "ImpersonationToken"("userId");

-- AddForeignKey
ALTER TABLE "DealerInventory" ADD CONSTRAINT "DealerInventory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationToken" ADD CONSTRAINT "ImpersonationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
