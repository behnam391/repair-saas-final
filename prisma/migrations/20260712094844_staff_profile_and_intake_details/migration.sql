-- CreateEnum
CREATE TYPE "ReceiptAck" AS ENUM ('SHOP_PRINTED_SIGNED', 'SITE_PRINTED_SIGNED', 'NO_SIGNATURE');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "customerDamageNotes" TEXT,
ADD COLUMN     "devicePasscode" TEXT,
ADD COLUMN     "receiptAck" "ReceiptAck";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "nationalId" TEXT;
