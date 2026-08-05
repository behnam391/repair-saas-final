/**
 * peyvo db-fix - restores the columns and tables the corrupted zip deleted.
 *
 * ADD / CREATE only. There is no DROP and no DELETE anywhere in this file,
 * so it cannot touch existing data.
 *
 *   dry run (shows what it would do):  node peyvo-recover/db-fix.mjs
 *   for real:                          node peyvo-recover/db-fix.mjs --apply
 *
 * Output is English on purpose: Windows cmd.exe cannot render right-to-left
 * text, so Persian output comes out reversed and unreadable there.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

// ---- load DATABASE_URL from .env if not already in the environment -------
if (!process.env.DATABASE_URL) {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(f, "utf8").split("\n")) {
        const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/);
        if (m) {
          process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
          console.log(`(DATABASE_URL loaded from ${f})`);
          break;
        }
      }
    } catch {}
    if (process.env.DATABASE_URL) break;
  }
}
if (!process.env.DATABASE_URL) {
  console.error("\nERROR: DATABASE_URL not found.\n");
  process.exit(1);
}

const maskUrl = (u) => {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.username ? x.username + ":***@" : ""}${x.host}${x.pathname}`;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
};

/** [label, SQL, constraint name to check for duplicates] */
const STATEMENTS = [
  ["User.specialty",
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "specialty" TEXT`],

  ["PlatformCustomer.passwordHash",
    `ALTER TABLE "PlatformCustomer" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT ''`],
  ["PlatformCustomer.passwordHash - drop the temporary default",
    `ALTER TABLE "PlatformCustomer" ALTER COLUMN "passwordHash" DROP DEFAULT`],
  ["PlatformCustomer.email",
    `ALTER TABLE "PlatformCustomer" ADD COLUMN IF NOT EXISTS "email" TEXT`],
  ["PlatformCustomer.province",
    `ALTER TABLE "PlatformCustomer" ADD COLUMN IF NOT EXISTS "province" TEXT`],
  ["PlatformCustomer.city",
    `ALTER TABLE "PlatformCustomer" ADD COLUMN IF NOT EXISTS "city" TEXT`],
  ["PlatformCustomer.active",
    `ALTER TABLE "PlatformCustomer" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true`],

  ["Invoice.type",
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'REPAIR'`],
  ["Invoice.customerName",
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerName" TEXT`],
  ["Invoice.customerPhone",
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT`],
  ["Invoice.paymentAuthority",
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentAuthority" TEXT`],
  ["Invoice.paymentRefId",
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentRefId" TEXT`],
  ["Invoice.ticketId - make optional again (needed for direct SALE invoices)",
    `ALTER TABLE "Invoice" ALTER COLUMN "ticketId" DROP NOT NULL`],

  ["InventoryItem.category",
    `ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'PART'`],
  ["InventoryItem.description",
    `ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "description" TEXT`],
  ["InventoryItem.deviceModel",
    `ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "deviceModel" TEXT`],
  ["InventoryItem.imageUrl",
    `ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`],

  ["MarketListing.imageUrl",
    `ALTER TABLE "MarketListing" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`],
  ["Message.imageUrl",
    `ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`],
  ["DealerInventory.imageUrl",
    `ALTER TABLE "DealerInventory" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`],

  ["table InvoiceItem",
    `CREATE TABLE IF NOT EXISTS "InvoiceItem" (
       "id" TEXT NOT NULL,
       "invoiceId" TEXT NOT NULL,
       "itemId" TEXT NOT NULL,
       "quantity" INTEGER NOT NULL DEFAULT 1,
       "priceCharged" INTEGER NOT NULL,
       CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
     )`],
  ["index InvoiceItem_invoiceId_idx",
    `CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId")`],
  ["foreign key InvoiceItem -> Invoice",
    `ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
       FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    "InvoiceItem_invoiceId_fkey"],
  ["foreign key InvoiceItem -> InventoryItem",
    `ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_itemId_fkey"
       FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    "InvoiceItem_itemId_fkey"],

  ["table CustomerPasswordResetToken",
    `CREATE TABLE IF NOT EXISTS "CustomerPasswordResetToken" (
       "id" TEXT NOT NULL,
       "customerId" TEXT NOT NULL,
       "code" TEXT NOT NULL,
       "expiresAt" TIMESTAMP(3) NOT NULL,
       "used" BOOLEAN NOT NULL DEFAULT false,
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT "CustomerPasswordResetToken_pkey" PRIMARY KEY ("id")
     )`],
  ["index CustomerPasswordResetToken_customerId_idx",
    `CREATE INDEX IF NOT EXISTS "CustomerPasswordResetToken_customerId_idx" ON "CustomerPasswordResetToken"("customerId")`],
  ["foreign key CustomerPasswordResetToken -> PlatformCustomer",
    `ALTER TABLE "CustomerPasswordResetToken" ADD CONSTRAINT "CustomerPasswordResetToken_customerId_fkey"
       FOREIGN KEY ("customerId") REFERENCES "PlatformCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    "CustomerPasswordResetToken_customerId_fkey"],
];

if (!APPLY) {
  console.log("\n---- DRY RUN - nothing was executed ----\n");
  console.log(`Target: ${maskUrl(process.env.DATABASE_URL)}`);
  console.log("\nThese statements would run:\n");
  for (const [label] of STATEMENTS) console.log(`  - ${label}`);
  console.log("\nTo actually run them:\n  node peyvo-recover/db-fix.mjs --apply\n");
  process.exit(0);
}

console.log(`Target: ${maskUrl(process.env.DATABASE_URL)}`);
const db = new PrismaClient({ log: [] });
let done = 0, skipped = 0, failed = 0;

try {
  const existing = new Set(
    (await db.$queryRawUnsafe(
      `SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema='public'`
    )).map((r) => r.constraint_name)
  );

  console.log("\n---- APPLYING ----\n");
  for (const [label, sql, constraintName] of STATEMENTS) {
    if (constraintName && existing.has(constraintName)) {
      console.log(`  SKIP  ${label}  (already there)`);
      skipped++;
      continue;
    }
    try {
      await db.$executeRawUnsafe(sql);
      console.log(`  OK    ${label}`);
      done++;
    } catch (e) {
      console.log(`  FAIL  ${label} - ${e.message.split("\n").filter(Boolean).slice(-2).join(" ").trim()}`);
      failed++;
    }
  }

  console.log(`\nDone: ${done} | Skipped: ${skipped} | Failed: ${failed}\n`);
  console.log("Next steps:");
  console.log("  1) node peyvo-recover/db-doctor.mjs      <- confirm everything is OK now");
  console.log("  2) npx prisma db push                    <- let Prisma rebuild anything else");
  console.log('  3) node peyvo-recover/restore-from-backup.mjs "<path to backup.json>"');
  console.log("  4) Redeploy on Vercel\n");
} catch (e) {
  console.error("\nERROR:\n");
  console.error(e.message, "\n");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
