CREATE TABLE "BalePreference" ("phone" TEXT PRIMARY KEY, "enabled" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "BaleCampaign" ("id" TEXT PRIMARY KEY, "message" TEXT NOT NULL, "audience" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "BaleDelivery" ("id" TEXT PRIMARY KEY, "campaignId" TEXT NOT NULL REFERENCES "BaleCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "phone" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX "BaleDelivery_campaignId_phone_key" ON "BaleDelivery"("campaignId", "phone");
