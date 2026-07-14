-- CreateEnum
CREATE TYPE "PendingIntakeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "AdBanner" ADD COLUMN     "displayType" TEXT NOT NULL DEFAULT 'BANNER';

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "aboutUsContent" TEXT,
ADD COLUMN     "guideUrl" TEXT,
ADD COLUMN     "telegramBotToken" TEXT,
ADD COLUMN     "telegramBotUsername" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "supportAccessEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PendingIntake" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "imei" TEXT,
    "issueDescription" TEXT NOT NULL,
    "status" "PendingIntakeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "ticketId" TEXT,
    "technicianId" TEXT,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "customerPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalApiKey" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingIntake_shopId_status_idx" ON "PendingIntake"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_ticketId_key" ON "Rating"("ticketId");

-- CreateIndex
CREATE INDEX "Rating_shopId_idx" ON "Rating"("shopId");

-- CreateIndex
CREATE INDEX "Rating_technicianId_idx" ON "Rating"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalApiKey_apiKey_key" ON "ExternalApiKey"("apiKey");

-- AddForeignKey
ALTER TABLE "PendingIntake" ADD CONSTRAINT "PendingIntake_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
