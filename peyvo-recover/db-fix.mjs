/**
 * peyvo db-fix — ستون‌ها و جدول‌هایی را که فایل زیپ حذف کرده بود برمی‌گرداند.
 *
 * فقط ADD / CREATE. هیچ DROP یا DELETE ای در این فایل نیست،
 * پس روی داده‌های موجود دست نمی‌گذارد.
 *
 * نمایش بدون اجرا:  node peyvo-recover/db-fix.mjs
 * اجرای واقعی:      node peyvo-recover/db-fix.mjs --apply
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

// ---- خواندن DATABASE_URL از .env اگر در محیط نبود ----------------------
if (!process.env.DATABASE_URL) {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(f, "utf8").split("\n")) {
        const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/);
        if (m) {
          process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
          console.log(`(DATABASE_URL از ${f} خوانده شد)`);
          break;
        }
      }
    } catch {}
    if (process.env.DATABASE_URL) break;
  }
}
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL پیدا نشد.");
  process.exit(1);
}

/** [توضیح فارسی, SQL, نام constraint برای بررسی تکراری‌نبودن] */
const STATEMENTS = [
  ["User.specialty",
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "specialty" TEXT`],

  ["PlatformCustomer.passwordHash",
    `ALTER TABLE "PlatformCustomer" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT ''`],
  ["PlatformCustomer.passwordHash — برداشتن مقدار پیش‌فرض",
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
  ["Invoice.ticketId — اختیاری‌کردن دوباره (برای فاکتور فروش مستقیم)",
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

  ["جدول InvoiceItem",
    `CREATE TABLE IF NOT EXISTS "InvoiceItem" (
       "id" TEXT NOT NULL,
       "invoiceId" TEXT NOT NULL,
       "itemId" TEXT NOT NULL,
       "quantity" INTEGER NOT NULL DEFAULT 1,
       "priceCharged" INTEGER NOT NULL,
       CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
     )`],
  ["ایندکس InvoiceItem_invoiceId_idx",
    `CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId")`],
  ["کلید خارجی InvoiceItem → Invoice",
    `ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
       FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    "InvoiceItem_invoiceId_fkey"],
  ["کلید خارجی InvoiceItem → InventoryItem",
    `ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_itemId_fkey"
       FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    "InvoiceItem_itemId_fkey"],

  ["جدول CustomerPasswordResetToken",
    `CREATE TABLE IF NOT EXISTS "CustomerPasswordResetToken" (
       "id" TEXT NOT NULL,
       "customerId" TEXT NOT NULL,
       "code" TEXT NOT NULL,
       "expiresAt" TIMESTAMP(3) NOT NULL,
       "used" BOOLEAN NOT NULL DEFAULT false,
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT "CustomerPasswordResetToken_pkey" PRIMARY KEY ("id")
     )`],
  ["ایندکس CustomerPasswordResetToken_customerId_idx",
    `CREATE INDEX IF NOT EXISTS "CustomerPasswordResetToken_customerId_idx" ON "CustomerPasswordResetToken"("customerId")`],
  ["کلید خارجی CustomerPasswordResetToken → PlatformCustomer",
    `ALTER TABLE "CustomerPasswordResetToken" ADD CONSTRAINT "CustomerPasswordResetToken_customerId_fkey"
       FOREIGN KEY ("customerId") REFERENCES "PlatformCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    "CustomerPasswordResetToken_customerId_fkey"],
];

if (!APPLY) {
  console.log("\n── حالت نمایش (چیزی اجرا نشد) ──\n");
  console.log("این دستورها اجرا خواهند شد:\n");
  for (const [label] of STATEMENTS) console.log(`  • ${label}`);
  console.log("\nبرای اجرای واقعی:\n  node peyvo-recover/db-fix.mjs --apply\n");
  process.exit(0);
}

const db = new PrismaClient({ log: [] });
let done = 0, skipped = 0, failed = 0;

try {
  const existing = new Set(
    (await db.$queryRawUnsafe(
      `SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema='public'`
    )).map((r) => r.constraint_name)
  );

  console.log("\n── اجرای اصلاحات ──\n");
  for (const [label, sql, constraintName] of STATEMENTS) {
    if (constraintName && existing.has(constraintName)) {
      console.log(`  ↷ ${label} — از قبل موجود بود`);
      skipped++;
      continue;
    }
    try {
      await db.$executeRawUnsafe(sql);
      console.log(`  ✅ ${label}`);
      done++;
    } catch (e) {
      console.log(`  ⚠️  ${label} — ${e.message.split("\n").slice(-2).join(" ").trim()}`);
      failed++;
    }
  }

  console.log(`\nانجام‌شده: ${done} | رد‌شده: ${skipped} | خطا: ${failed}\n`);
  console.log("قدم بعدی:");
  console.log("  ۱) node peyvo-recover/db-doctor.mjs   ← دوباره چک کن که همه چیز ✅ باشد");
  console.log("  ۲) در ورسل یک Redeploy بزن");
  console.log("  ۳) دوباره وارد پنل شو\n");
} catch (e) {
  console.error("\n❌ خطا:\n", e.message, "\n");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
