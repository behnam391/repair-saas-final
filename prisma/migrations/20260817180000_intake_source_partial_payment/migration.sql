ALTER TABLE "Ticket"
ADD COLUMN "intakeSource" TEXT NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN "partnerName" TEXT,
ADD COLUMN "partnerPhone" TEXT;

ALTER TABLE "Invoice"
ADD COLUMN "paidAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "paymentPendingAmount" INTEGER,
ADD COLUMN "lastPaymentAt" TIMESTAMP(3);

UPDATE "Invoice"
SET "paidAmount" = "total", "lastPaymentAt" = NOW()
WHERE "paid" = TRUE;
