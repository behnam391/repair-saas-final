/**
 * peyvo restore-from-backup - puts back the data the corrupted zip wiped,
 * reading it from the Telegram backup file.
 *
 *   dry run (changes nothing):
 *     node peyvo-recover/restore-from-backup.mjs "C:\Users\Behnam\Downloads\peyvo-backup-2026-07-30.json"
 *
 *   for real:
 *     node peyvo-recover/restore-from-backup.mjs "C:\Users\Behnam\Downloads\peyvo-backup-2026-07-30.json" --apply
 *
 * Safety rules obeyed everywhere in this file - no exceptions:
 *   - there is no DROP, no DELETE and no TRUNCATE anywhere in this file
 *   - a value that is already filled in is never overwritten; only blanks get filled
 *   - no row is inserted into a table that already has rows
 *   - rows created after the backup date are never touched
 *   - password hashes are only moved, never printed
 *
 * Prerequisite: run `db-fix.mjs --apply` and then `npx prisma db push` first,
 * so the deleted columns and tables exist again.
 *
 * Output is English on purpose: Windows cmd.exe cannot render right-to-left
 * text, so Persian output comes out reversed and unreadable there.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const backupPath = args.find((a) => !a.startsWith("--"));

if (!backupPath) {
  console.error("\nGive me the path to the backup file. Example:");
  console.error('  node peyvo-recover/restore-from-backup.mjs "C:\\Users\\Behnam\\Downloads\\peyvo-backup-2026-07-30.json"\n');
  process.exit(1);
}

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

/** Show host/db but never the password. */
const maskUrl = (u) => {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.username ? x.username + ":***@" : ""}${x.host}${x.pathname}`;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
};

// ---- the backup file ----------------------------------------------------
let backup;
try {
  backup = JSON.parse(readFileSync(backupPath, "utf8"));
} catch (e) {
  console.error(`\nERROR: could not read the backup file: ${e.message}\n`);
  process.exit(1);
}
if (backup.app !== "peyvo" || !backup.models) {
  console.error("\nERROR: this file is not a peyvo backup.\n");
  process.exit(1);
}
const rowsOf = (name) => (Array.isArray(backup.models[name]) ? backup.models[name] : []);

console.log(`\n  Backup file: ${backupPath}`);
console.log(`  Taken at:    ${backup.exportedAt}`);
console.log(`  Target:      ${maskUrl(process.env.DATABASE_URL)}`);
console.log(`  Mode:        ${APPLY ? "APPLY - writing for real" : "DRY RUN - nothing changes"}\n`);

const empty = (v) => v === null || v === undefined || v === "";

/**
 * How each column is restored:
 *   "fill"    -> only if it is blank right now (NULL or "") and the backup has a value
 *   "default" -> only if it is exactly the default value right now and the backup says otherwise
 *   "false"   -> only if the backup said false and it is true right now (booleans)
 */
const COLUMN_REPAIRS = [
  {
    label: "User.specialty - shop staff specialty",
    model: "user",
    table: "User",
    fields: [["specialty", "fill"]],
  },
  {
    label: "PlatformCustomer - password, email, province, city, active flag",
    model: "platformCustomer",
    table: "PlatformCustomer",
    fields: [
      ["passwordHash", "fill"],
      ["email", "fill"],
      ["province", "fill"],
      ["city", "fill"],
      ["active", "false"],
    ],
  },
  {
    label: "Invoice - invoice type, customer name and phone, online payment fields",
    model: "invoice",
    table: "Invoice",
    fields: [
      ["type", "default", "REPAIR"],
      ["customerName", "fill"],
      ["customerPhone", "fill"],
      ["paymentAuthority", "fill"],
      ["paymentRefId", "fill"],
    ],
  },
  {
    label: "InventoryItem - category, device model, description, image",
    model: "inventoryItem",
    table: "InventoryItem",
    fields: [
      ["category", "default", "PART"],
      ["deviceModel", "fill"],
      ["description", "fill"],
      ["imageUrl", "fill"],
    ],
  },
  {
    label: "MarketListing.imageUrl - marketplace listing photos",
    model: "marketListing",
    table: "MarketListing",
    fields: [["imageUrl", "fill"]],
  },
  {
    label: "Message.imageUrl - chat message photos",
    model: "message",
    table: "Message",
    fields: [["imageUrl", "fill"]],
  },
  {
    label: "DealerInventory.imageUrl - wholesale device photos",
    model: "dealerInventory",
    table: "DealerInventory",
    fields: [["imageUrl", "fill"]],
  },
];

/** Tables that were dropped entirely and rebuilt empty.
 *  Order matters: parent tables before child tables. */
const ROW_REPAIRS = [
  ["invoiceItem", "InvoiceItem", "sale invoice line items"],
  ["customerPasswordResetToken", "CustomerPasswordResetToken", "customer password reset codes"],
  ["expense", "Expense", "expenses"],
  ["walletTransaction", "WalletTransaction", "wallet transactions"],
  ["giftCode", "GiftCode", "gift codes"],
  ["ticketMessage", "TicketMessage", "ticket messages"],
  ["signupVerification", "SignupVerification", "signup verifications"],
  ["shopPartnership", "ShopPartnership", "shop partnerships"],
  ["shopReferral", "ShopReferral", "shop referrals"],
  ["errorLog", "ErrorLog", "error logs"],
];

const db = new PrismaClient({ log: [] });
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const short = (e) => String(e.message || e).split("\n").filter(Boolean).slice(-2).join(" ").trim().slice(0, 160);

let totalUpdated = 0;
let totalInserted = 0;
let blocked = 0;

try {
  // ---- which columns actually exist in the database right now ----------
  const colInfo = await db.$queryRawUnsafe(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
  );
  const dbCols = new Map(); // table -> Set(column)
  for (const c of colInfo) {
    if (!dbCols.has(c.table_name)) dbCols.set(c.table_name, new Set());
    dbCols.get(c.table_name).add(c.column_name);
  }

  // ======================================================================
  // PART 1 - columns that were dropped while the rows stayed in place
  // ======================================================================
  console.log("========== PART 1: refilling the emptied columns ==========\n");

  for (const rep of COLUMN_REPAIRS) {
    const cols = dbCols.get(rep.table);
    if (!cols) {
      console.log(`  SKIP  ${rep.label}`);
      console.log(`        table "${rep.table}" is not in the database - run \`npx prisma db push\` first`);
      blocked++;
      continue;
    }
    const missing = rep.fields.map(([f]) => f).filter((f) => !cols.has(f));
    if (missing.length) {
      console.log(`  SKIP  ${rep.label}`);
      console.log(`        these columns do not exist yet: ${missing.join(", ")}`);
      console.log("        run db-fix.mjs --apply and then `npx prisma db push` first");
      blocked++;
      continue;
    }

    const src = rowsOf(rep.model).filter((r) => r && r.id);
    if (src.length === 0) {
      console.log(`  --    ${rep.label}`);
      console.log("        the backup has no data for this one");
      continue;
    }

    // Read the current state of those columns so a filled value is never overwritten
    const select = { id: true };
    for (const [f] of rep.fields) select[f] = true;
    let current;
    try {
      current = await db[rep.model].findMany({ select });
    } catch (e) {
      console.log(`  SKIP  ${rep.label}`);
      console.log(`        could not read from the database (${short(e)})`);
      blocked++;
      continue;
    }
    const byId = new Map(current.map((r) => [r.id, r]));

    // For each row, build a patch that only fills the blanks
    const patches = [];
    for (const b of src) {
      const now = byId.get(b.id);
      if (!now) continue; // this row is not in the database now - leave it alone
      const data = {};
      for (const [f, mode, def] of rep.fields) {
        const val = b[f];
        if (mode === "fill") {
          if (!empty(val) && empty(now[f])) data[f] = val;
        } else if (mode === "default") {
          if (!empty(val) && val !== now[f] && now[f] === def) data[f] = val;
        } else if (mode === "false") {
          if (val === false && now[f] === true) data[f] = false;
        }
      }
      if (Object.keys(data).length) patches.push({ id: b.id, data });
    }

    if (patches.length === 0) {
      console.log(`  OK    ${rep.label}`);
      console.log(`        nothing left to restore (${src.length} rows in the backup, all already fine)`);
      continue;
    }
    if (!APPLY) {
      const per = {};
      for (const p of patches) for (const k of Object.keys(p.data)) per[k] = (per[k] || 0) + 1;
      console.log(`  WOULD ${rep.label}`);
      console.log(`        ${patches.length} rows would be restored ->  ${Object.entries(per).map(([k, v]) => `${k}: ${v}`).join("  |  ")}`);
      continue;
    }

    let updated = 0;
    let failed = 0;
    let firstErr = "";
    for (const batch of chunk(patches, 100)) {
      try {
        await db.$transaction(batch.map((p) => db[rep.model].update({ where: { id: p.id }, data: p.data })));
        updated += batch.length;
      } catch {
        // If one row in the batch is bad, do the rest of the batch one by one
        for (const p of batch) {
          try {
            await db[rep.model].update({ where: { id: p.id }, data: p.data });
            updated++;
          } catch (e) {
            failed++;
            if (!firstErr) firstErr = short(e);
          }
        }
      }
    }
    totalUpdated += updated;
    console.log(`  OK    ${rep.label}`);
    console.log(`        ${updated} rows restored${failed ? ` | ${failed} rows failed (${firstErr})` : ""}`);
  }

  // ======================================================================
  // PART 2 - tables that were dropped entirely and rebuilt empty
  // ======================================================================
  console.log("\n========== PART 2: refilling the emptied tables ==========\n");

  for (const [model, table, label] of ROW_REPAIRS) {
    const cols = dbCols.get(table);
    if (!cols) {
      console.log(`  SKIP  ${label} (${table}) - table does not exist, run \`npx prisma db push\` first`);
      blocked++;
      continue;
    }

    const src = rowsOf(model).filter((r) => r && r.id);
    if (src.length === 0) {
      console.log(`  --    ${label} - empty in the backup file`);
      continue;
    }

    let current;
    try {
      current = await db[model].count();
    } catch (e) {
      console.log(`  SKIP  ${label} - could not read it (${short(e)})`);
      blocked++;
      continue;
    }
    if (current > 0) {
      console.log(`  SKIP  ${label} - it already has ${current} rows, not touching it`);
      continue;
    }
    if (!APPLY) {
      console.log(`  WOULD ${label} - ${src.length} rows would be inserted from the backup (the table is empty now)`);
      continue;
    }

    // Only the columns that actually exist in the database
    const data = src.map((r) => {
      const o = {};
      for (const k of Object.keys(r)) if (cols.has(k)) o[k] = r[k];
      return o;
    });

    let ok = 0;
    let bad = 0;
    let firstErr = "";
    try {
      const res = await db[model].createMany({ data, skipDuplicates: true });
      ok = res.count;
    } catch {
      // One broken row must not cost the whole table - insert one by one
      for (const row of data) {
        try {
          await db[model].create({ data: row });
          ok++;
        } catch (e) {
          bad++;
          if (!firstErr) firstErr = short(e);
        }
      }
    }
    totalInserted += ok;
    console.log(`  OK    ${label} - ${ok} rows inserted${bad ? ` | ${bad} rows rejected (${firstErr})` : ""}`);
  }

  // ======================================================================
  console.log("\n========== SUMMARY ==========\n");
  if (blocked) {
    console.log(`  WARNING: ${blocked} items were skipped because their column or table does not exist yet.`);
    console.log("  Run these two first, then run this script again:");
    console.log("        node peyvo-recover/db-fix.mjs --apply");
    console.log("        npx prisma db push\n");
  }
  if (!APPLY) {
    console.log("  Nothing was changed. To do it for real, add --apply at the end:\n");
    console.log(`  node peyvo-recover/restore-from-backup.mjs "${backupPath}" --apply\n`);
  } else {
    console.log(`  ${totalUpdated} rows updated`);
    console.log(`  ${totalInserted} rows inserted\n`);
    console.log("  Next:  node peyvo-recover/db-doctor.mjs  ->  then Redeploy on Vercel\n");
    console.log("  NOTE: anything created between the backup date and today is not in the");
    console.log("  backup file, so the dropped columns of those rows stay blank and have to");
    console.log("  be filled in by hand.\n");
  }
} catch (e) {
  console.error("\nERROR:\n", short(e), "\n");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
