-- Existing shops and repair records remain mobile by default. Shops can then
-- opt into COMPUTER or MOBILE,COMPUTER from their settings.
ALTER TABLE "Shop" ADD COLUMN "serviceCategories" TEXT NOT NULL DEFAULT 'MOBILE';
ALTER TABLE "Ticket" ADD COLUMN "deviceCategory" TEXT NOT NULL DEFAULT 'MOBILE';
ALTER TABLE "PendingIntake" ADD COLUMN "deviceCategory" TEXT NOT NULL DEFAULT 'MOBILE';
