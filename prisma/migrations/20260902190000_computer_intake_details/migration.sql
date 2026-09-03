ALTER TABLE "Ticket" ADD COLUMN "deviceType" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "deviceBrand" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "operatingSystem" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "accessories" TEXT;

ALTER TABLE "PendingIntake" ADD COLUMN "deviceType" TEXT;
ALTER TABLE "PendingIntake" ADD COLUMN "deviceBrand" TEXT;
ALTER TABLE "PendingIntake" ADD COLUMN "operatingSystem" TEXT;
ALTER TABLE "PendingIntake" ADD COLUMN "accessories" TEXT;
