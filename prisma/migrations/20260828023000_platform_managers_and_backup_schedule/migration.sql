ALTER TABLE "PlatformAdmin"
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'MANAGER',
ADD COLUMN "permissions" TEXT NOT NULL DEFAULT '',
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- The oldest platform account is the product owner.
UPDATE "PlatformAdmin"
SET "role" = 'OWNER', "permissions" = '*'
WHERE "id" = (SELECT "id" FROM "PlatformAdmin" ORDER BY "createdAt" ASC LIMIT 1);

ALTER TABLE "PlatformSettings"
ADD COLUMN "telegramBackupEnabled" BOOLEAN DEFAULT false,
ADD COLUMN "telegramBackupHour" INTEGER DEFAULT 3;
