-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_ticketId_fkey";

-- AlterTable
ALTER TABLE "DealerInventory" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'PART',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "deviceModel" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "paymentAuthority" TEXT,
ADD COLUMN     "paymentRefId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'REPAIR',
ALTER COLUMN "ticketId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "PlatformCustomer" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceCharged" INTEGER NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
