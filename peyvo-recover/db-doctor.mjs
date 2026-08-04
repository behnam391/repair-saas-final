/**
 * peyvo db-doctor — فقط می‌خوانَد. هیچ چیزی را تغییر نمی‌دهد.
 *
 * اجرا:  node peyvo-recover/db-doctor.mjs
 *
 * ساختار واقعیِ دیتابیس را با schema.prisma مقایسه می‌کند و می‌گوید
 * دقیقاً چه ستون‌ها و جدول‌هایی گم شده‌اند.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

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
  console.error("❌ DATABASE_URL پیدا نشد. یا در .env بگذار یا این‌طور اجرا کن:");
  console.error('   DATABASE_URL="postgres://..." node peyvo-recover/db-doctor.mjs');
  process.exit(1);
}

// ستون‌هایی که فایل زیپ از schema حذف کرده بود:
const EXPECTED_COLUMNS = {
  User: ["specialty"],
  PlatformCustomer: ["passwordHash", "email", "province", "city", "active"],
  Invoice: ["type", "customerName", "customerPhone", "paymentAuthority", "paymentRefId"],
  InventoryItem: ["category", "description", "deviceModel", "imageUrl"],
  MarketListing: ["imageUrl"],
  Message: ["imageUrl"],
  DealerInventory: ["imageUrl"],
};

// جدول‌هایی که باید وجود داشته باشند:
const EXPECTED_TABLES = [
  "InvoiceItem", "CustomerPasswordResetToken", "Expense", "WalletTransaction",
  "GiftCode", "TicketMessage", "SignupVerification", "ErrorLog",
  "ShopPartnership", "ShopReferral",
];

// جدولی که فقط فایل زیپ ساخته بود و در schema درست وجود ندارد:
const JUNK_TABLES = ["CustomerOtp"];

const db = new PrismaClient({ log: [] });

const has = (set, t, c) => set.has(`${t}.${c}`);

try {
  const colRows = await db.$queryRawUnsafe(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
  );
  const tabRows = await db.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );

  const cols = new Set(colRows.map((r) => `${r.table_name}.${r.column_name}`));
  const tables = new Set(tabRows.map((r) => r.table_name));

  console.log("\n══════════ گزارش وضعیت دیتابیس پیوو ══════════\n");

  // ---- ستون‌های گم‌شده -------------------------------------------------
  const missingCols = [];
  for (const [table, list] of Object.entries(EXPECTED_COLUMNS)) {
    if (!tables.has(table)) continue;
    for (const c of list) if (!has(cols, table, c)) missingCols.push(`${table}.${c}`);
  }

  console.log("۱) ستون‌های گم‌شده");
  if (missingCols.length === 0) {
    console.log("   ✅ همه‌ی ستون‌ها سرِ جایشان هستند.");
  } else {
    for (const c of missingCols) console.log(`   ❌ ${c}`);
  }

  // ---- جدول‌های گم‌شده -------------------------------------------------
  const missingTables = EXPECTED_TABLES.filter((t) => !tables.has(t));
  console.log("\n۲) جدول‌های گم‌شده");
  if (missingTables.length === 0) {
    console.log("   ✅ همه‌ی جدول‌ها موجودند.");
  } else {
    for (const t of missingTables) console.log(`   ❌ ${t}`);
  }

  // ---- جدول‌های اضافیِ زیپ ---------------------------------------------
  const junk = JUNK_TABLES.filter((t) => tables.has(t));
  console.log("\n۳) جدول‌های اضافیِ فایل زیپ");
  if (junk.length === 0) {
    console.log("   ✅ چیزی اضافه نشده.");
  } else {
    for (const t of junk) console.log(`   ⚠️  ${t} (ساخته‌ی زیپ — بی‌استفاده)`);
  }

  // ---- شمارش رکوردها --------------------------------------------------
  const count = async (sql) => {
    try {
      const r = await db.$queryRawUnsafe(sql);
      return Number(r[0].n);
    } catch {
      return null;
    }
  };

  console.log("\n۴) داده‌ها");
  const users = await count(`SELECT COUNT(*)::int AS n FROM "User"`);
  console.log(`   کاربران مغازه (User): ${users ?? "—"}`);
  if (has(cols, "User", "passwordHash")) {
    const bad = await count(
      `SELECT COUNT(*)::int AS n FROM "User" WHERE "passwordHash" IS NULL OR "passwordHash" = ''`
    );
    console.log(`     از این تعداد، بدون رمز: ${bad ?? "—"}`);
  } else {
    console.log("     ❌ ستون User.passwordHash اصلاً وجود ندارد!");
  }

  if (tables.has("PlatformCustomer")) {
    const pc = await count(`SELECT COUNT(*)::int AS n FROM "PlatformCustomer"`);
    console.log(`   مشتریان پلتفرم (PlatformCustomer): ${pc ?? "—"}`);
    if (has(cols, "PlatformCustomer", "passwordHash")) {
      const bad = await count(
        `SELECT COUNT(*)::int AS n FROM "PlatformCustomer" WHERE "passwordHash" IS NULL OR "passwordHash" = ''`
      );
      console.log(`     از این تعداد، بدون رمز: ${bad ?? "—"}`);
    } else {
      console.log("     ❌ ستون PlatformCustomer.passwordHash حذف شده — رمزها از بین رفته‌اند.");
    }
  }

  for (const t of ["Shop", "Ticket", "Invoice", "InventoryItem", "PlatformAdmin"]) {
    if (tables.has(t)) console.log(`   ${t}: ${(await count(`SELECT COUNT(*)::int AS n FROM "${t}"`)) ?? "—"}`);
  }

  // ---- نتیجه‌گیری ------------------------------------------------------
  console.log("\n══════════ نتیجه ══════════\n");
  if (missingCols.length === 0 && missingTables.length === 0) {
    console.log("دیتابیس با schema هماهنگ است. مشکلِ ورود جای دیگری است —");
    console.log("خروجی همین فایل را برایم بفرست تا ادامه بدهیم.");
  } else {
    console.log("دیتابیس با schema هماهنگ نیست. کدِ سایت ستون‌هایی را می‌خواهد");
    console.log("که در دیتابیس نیستند، برای همین هر ورودی خطا می‌دهد و پیام");
    console.log('«رمز عبور اشتباه است» نشان داده می‌شود.');
    console.log("\nقدم بعدی:  node peyvo-recover/db-fix.mjs");
  }
  console.log("");
} catch (e) {
  console.error("\n❌ خطا در اتصال یا اجرای پرس‌وجو:\n", e.message, "\n");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
