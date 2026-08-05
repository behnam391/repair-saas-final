/**
 * peyvo db-doctor - READ ONLY. Changes nothing.
 *
 *   node peyvo-recover/db-doctor.mjs
 *
 * Compares the real database structure against schema.prisma and reports
 * exactly which columns and tables are missing.
 *
 * Output is English on purpose: Windows cmd.exe cannot render right-to-left
 * text, so Persian output comes out reversed and unreadable there.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

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
  console.error("\nERROR: DATABASE_URL not found.");
  console.error("Put it in .env, or run:");
  console.error('  $env:DATABASE_URL="postgres://..." ; node peyvo-recover/db-doctor.mjs\n');
  process.exit(1);
}

/** Show host/db but never the password. */
const maskUrl = (u) => {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.username ? x.username + ":***@" : ""}${x.host}${x.pathname}`;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
};
console.log(`Target: ${maskUrl(process.env.DATABASE_URL)}`);

// Columns the corrupted zip schema deleted:
const EXPECTED_COLUMNS = {
  User: ["specialty"],
  PlatformCustomer: ["passwordHash", "email", "province", "city", "active"],
  Invoice: ["type", "customerName", "customerPhone", "paymentAuthority", "paymentRefId"],
  InventoryItem: ["category", "description", "deviceModel", "imageUrl"],
  MarketListing: ["imageUrl"],
  Message: ["imageUrl"],
  DealerInventory: ["imageUrl"],
};

// Tables that must exist:
const EXPECTED_TABLES = [
  "InvoiceItem", "CustomerPasswordResetToken", "Expense", "WalletTransaction",
  "GiftCode", "TicketMessage", "SignupVerification", "ErrorLog",
  "ShopPartnership", "ShopReferral",
];

// Table the zip created that the real schema has no use for:
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

  console.log("\n========== peyvo database report ==========\n");

  // ---- missing columns --------------------------------------------------
  const missingCols = [];
  for (const [table, list] of Object.entries(EXPECTED_COLUMNS)) {
    if (!tables.has(table)) continue;
    for (const c of list) if (!has(cols, table, c)) missingCols.push(`${table}.${c}`);
  }

  console.log("1) MISSING COLUMNS");
  if (missingCols.length === 0) {
    console.log("   OK - every expected column is present.");
  } else {
    for (const c of missingCols) console.log(`   MISSING  ${c}`);
  }

  // ---- missing tables ---------------------------------------------------
  const missingTables = EXPECTED_TABLES.filter((t) => !tables.has(t));
  console.log("\n2) MISSING TABLES");
  if (missingTables.length === 0) {
    console.log("   OK - every expected table is present.");
  } else {
    for (const t of missingTables) console.log(`   MISSING  ${t}`);
  }

  // ---- junk tables left behind by the zip -------------------------------
  const junk = JUNK_TABLES.filter((t) => tables.has(t));
  console.log("\n3) LEFTOVER TABLES FROM THE ZIP");
  if (junk.length === 0) {
    console.log("   OK - nothing extra.");
  } else {
    for (const t of junk) console.log(`   EXTRA    ${t}  (created by the zip, unused)`);
  }

  // ---- row counts -------------------------------------------------------
  const count = async (sql) => {
    try {
      const r = await db.$queryRawUnsafe(sql);
      return Number(r[0].n);
    } catch {
      return null;
    }
  };

  console.log("\n4) DATA");
  const users = await count(`SELECT COUNT(*)::int AS n FROM "User"`);
  console.log(`   User (shop staff): ${users ?? "-"}`);
  if (has(cols, "User", "passwordHash")) {
    const bad = await count(
      `SELECT COUNT(*)::int AS n FROM "User" WHERE "passwordHash" IS NULL OR "passwordHash" = ''`
    );
    console.log(`     of those, with no password: ${bad ?? "-"}`);
  } else {
    console.log("     PROBLEM: column User.passwordHash does not exist at all!");
  }

  if (tables.has("PlatformCustomer")) {
    const pc = await count(`SELECT COUNT(*)::int AS n FROM "PlatformCustomer"`);
    console.log(`   PlatformCustomer: ${pc ?? "-"}`);
    if (has(cols, "PlatformCustomer", "passwordHash")) {
      const bad = await count(
        `SELECT COUNT(*)::int AS n FROM "PlatformCustomer" WHERE "passwordHash" IS NULL OR "passwordHash" = ''`
      );
      console.log(`     of those, with no password: ${bad ?? "-"}`);
    } else {
      console.log("     PROBLEM: PlatformCustomer.passwordHash was dropped - customer passwords are gone.");
    }
  }

  for (const t of ["Shop", "Ticket", "Invoice", "InventoryItem", "PlatformAdmin"]) {
    if (tables.has(t)) console.log(`   ${t}: ${(await count(`SELECT COUNT(*)::int AS n FROM "${t}"`)) ?? "-"}`);
  }

  // ---- verdict ----------------------------------------------------------
  console.log("\n========== VERDICT ==========\n");
  if (missingCols.length === 0 && missingTables.length === 0) {
    console.log("Database matches the schema. The login problem is somewhere else -");
    console.log("send me this output and we keep digging.");
  } else {
    console.log("Database does NOT match the schema. The live code asks for columns");
    console.log("that no longer exist, so every login throws and the page shows");
    console.log('"wrong phone or password".');
    console.log("\nNext:  node peyvo-recover/db-fix.mjs");
  }
  console.log("");
} catch (e) {
  console.error("\nERROR while connecting or querying:\n");
  console.error(e.message);
  console.error("\nCommon causes:");
  console.error("  - DATABASE_URL points at a local database, not the Vercel one");
  console.error("  - the connection string is missing ?sslmode=require");
  console.error("  - wrong password / database name\n");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
