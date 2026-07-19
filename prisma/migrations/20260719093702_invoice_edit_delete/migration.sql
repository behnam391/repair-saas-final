/*
  Warnings:

  - You are about to drop the column `service.1559a048ddc14aa09eac2501ce7261c4` on the `PlatformSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlatformSettings" DROP COLUMN "service.1559a048ddc14aa09eac2501ce7261c4",
ADD COLUMN     "neshanApiKey" TEXT;
