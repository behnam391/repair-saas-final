/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `DealerInventory` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `deviceModel` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paymentAuthority` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paymentRefId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `MarketListing` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `PlatformCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `PlatformCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `PlatformCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `PlatformCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `PlatformCustomer` table. All the data in the column will be lost.
  - You are about to drop the `CustomerPasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[shopId,platformCustomerId]` on the table `Rating` will be added. If there are existing duplicate values, this will fail.
  - Made the column `ticketId` on table `Invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CustomerPasswordResetToken" DROP CONSTRAINT "CustomerPasswordResetToken_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_itemId_fkey";

-- DropIndex
DROP INDEX "Rating_platformCustomerId_idx";

-- AlterTable
ALTER TABLE "DealerInventory" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "deviceModel",
DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
DROP COLUMN "paymentAuthority",
DROP COLUMN "paymentRefId",
DROP COLUMN "type",
ALTER COLUMN "ticketId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MarketListing" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "PlatformCustomer" DROP COLUMN "active",
DROP COLUMN "city",
DROP COLUMN "email",
DROP COLUMN "passwordHash",
DROP COLUMN "province";

-- DropTable
DROP TABLE "CustomerPasswordResetToken";

-- DropTable
DROP TABLE "InvoiceItem";

-- CreateTable
CREATE TABLE "CustomerOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platformCustomerId" TEXT,

    CONSTRAINT "CustomerOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerOtp_phone_idx" ON "CustomerOtp"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_shopId_platformCustomerId_key" ON "Rating"("shopId", "platformCustomerId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOtp" ADD CONSTRAINT "CustomerOtp_platformCustomerId_fkey" FOREIGN KEY ("platformCustomerId") REFERENCES "PlatformCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
