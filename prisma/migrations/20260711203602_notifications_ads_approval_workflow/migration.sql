-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('REQUEST', 'OFFER');

-- CreateEnum
CREATE TYPE "PartRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'REJECTED');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'AWAITING_APPROVAL';

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "condition" TEXT NOT NULL DEFAULT 'WORKING',
ADD COLUMN     "frequentlyUsed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "technicianWage" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "listingType" "ListingType" NOT NULL DEFAULT 'REQUEST';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "technicianNote" TEXT,
ADD COLUMN     "technicianReportedCost" INTEGER,
ADD COLUMN     "technicianWage" INTEGER;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdBanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartRequest" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "ticketId" TEXT,
    "itemName" TEXT NOT NULL,
    "note" TEXT,
    "status" "PartRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferencePrice" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "issueLabel" TEXT NOT NULL,
    "suggestedPrice" INTEGER NOT NULL,
    "source" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferencePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "PartRequest_shopId_status_idx" ON "PartRequest"("shopId", "status");

-- CreateIndex
CREATE INDEX "ReferencePrice_shopId_idx" ON "ReferencePrice"("shopId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferencePrice" ADD CONSTRAINT "ReferencePrice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
