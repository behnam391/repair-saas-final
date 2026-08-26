-- CreateEnum
CREATE TYPE "LoginSubjectKind" AS ENUM ('SHOP_USER', 'CUSTOMER', 'SUPERADMIN');

-- CreateTable
CREATE TABLE "LoginSession" (
    "id" TEXT NOT NULL,
    "subjectKind" "LoginSubjectKind" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "roleAtLogin" TEXT,
    "nameAtLogin" TEXT NOT NULL,
    "phoneAtLogin" TEXT NOT NULL,
    "shopId" TEXT,
    "shopNameAtLogin" TEXT,
    "provider" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "loggedOutAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByAdminId" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginSession_subjectKind_subjectId_idx" ON "LoginSession"("subjectKind", "subjectId");
CREATE INDEX "LoginSession_shopId_idx" ON "LoginSession"("shopId");
CREATE INDEX "LoginSession_signedInAt_idx" ON "LoginSession"("signedInAt");
CREATE INDEX "LoginSession_lastActivityAt_idx" ON "LoginSession"("lastActivityAt");
CREATE INDEX "LoginSession_revokedAt_loggedOutAt_expiresAt_idx" ON "LoginSession"("revokedAt", "loggedOutAt", "expiresAt");
