CREATE TABLE "PartnerContact" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PartnerContact_shopId_name_idx" ON "PartnerContact"("shopId", "name");
CREATE INDEX "PartnerContact_shopId_phone_idx" ON "PartnerContact"("shopId", "phone");
ALTER TABLE "PartnerContact" ADD CONSTRAINT "PartnerContact_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
