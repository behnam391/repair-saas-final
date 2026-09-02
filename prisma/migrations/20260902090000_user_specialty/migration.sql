-- The application has exposed User.specialty in Prisma and profile/staff APIs
-- since July, but the matching production migration was missing. IF NOT
-- EXISTS keeps this safe for databases where the column was added manually.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
