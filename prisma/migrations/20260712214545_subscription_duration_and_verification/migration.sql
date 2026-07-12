-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "businessSize" TEXT NOT NULL DEFAULT 'SOLO',
ADD COLUMN     "landlinePhone" TEXT,
ADD COLUMN     "specialties" TEXT,
ADD COLUMN     "verificationLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "verificationRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "months" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "devicePasscodeType" TEXT;
