-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "platformCustomerId" TEXT;

-- CreateTable
CREATE TABLE "PlatformCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPasswordResetToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCustomer_phone_key" ON "PlatformCustomer"("phone");

-- CreateIndex
CREATE INDEX "CustomerPasswordResetToken_customerId_idx" ON "CustomerPasswordResetToken"("customerId");

-- CreateIndex
CREATE INDEX "Rating_platformCustomerId_idx" ON "Rating"("platformCustomerId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_platformCustomerId_fkey" FOREIGN KEY ("platformCustomerId") REFERENCES "PlatformCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPasswordResetToken" ADD CONSTRAINT "CustomerPasswordResetToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "PlatformCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
