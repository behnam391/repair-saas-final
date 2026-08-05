/**
 * peyvo backup-inspect - reads the backup file and reports what is inside it.
 * It never connects to the database.
 *
 *   node peyvo-recover/backup-inspect.mjs "C:\\Users\\Behnam\\Downloads\\peyvo-backup-2026-07-30.json"
 *
 * Output is English on purpose: Windows cmd.exe cannot render right-to-left
 * text, so Persian output comes out reversed and unreadable there.
 */
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("\nGive me the path to the backup file. Example:");
  console.error('  node peyvo-recover/backup-inspect.mjs "C:\\Users\\Behnam\\Downloads\\peyvo-backup-2026-07-30.json"\n');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error(`\nERROR: could not read the file: ${e.message}\n`);
  process.exit(1);
}

console.log("\n========== backup contents ==========\n");
console.log(`  app:        ${data.app ?? "-"}`);
console.log(`  version:    ${data.version ?? "-"}`);
console.log(`  exportedAt: ${data.exportedAt ?? "-"}`);

const models = data.models ?? {};
const rows = [];
for (const [name, val] of Object.entries(models)) {
  rows.push([name, Array.isArray(val) ? val.length : `UNAVAILABLE ${JSON.stringify(val)}`]);
}
rows.sort((a, b) => (typeof b[1] === "number" ? b[1] : -1) - (typeof a[1] === "number" ? a[1] : -1));

console.log(`\n  ${rows.length} models in this file:\n`);
for (const [name, n] of rows) console.log(`    ${String(n).padStart(6)}  ${name}`);

// What the corrupted zip destroyed, and whether this backup still has it:
console.log("\n---- what the zip destroyed, and what this backup still has ----\n");

const check = (model, label, test) => {
  const arr = models[model];
  if (!Array.isArray(arr)) {
    console.log(`  MISSING  ${label}: not in this backup`);
    return;
  }
  if (!test) {
    console.log(`  ${arr.length > 0 ? "HAVE   " : "empty  "}  ${label}: ${arr.length} rows`);
    return;
  }
  const ok = arr.filter(test).length;
  console.log(`  ${ok > 0 ? "HAVE   " : "empty  "}  ${label}: ${ok} of ${arr.length} rows`);
};

check("platformCustomer", "platform customers WITH password", (r) => r.passwordHash);
check("user", "shop users WITH password", (r) => r.passwordHash);
check("user", "users with a specialty", (r) => r.specialty);
check("invoiceItem", "InvoiceItem rows (sale invoice lines)");
check("customerPasswordResetToken", "customer password reset codes");
check("expense", "expenses");
check("walletTransaction", "wallet transactions");
check("giftCode", "gift codes");
check("ticketMessage", "ticket messages");
check("errorLog", "error logs");
check("shopPartnership", "shop partnerships");
check("shopReferral", "shop referrals");

const inv = models.invoice;
if (Array.isArray(inv)) {
  const withType = inv.filter((r) => r.type).length;
  const withName = inv.filter((r) => r.customerName).length;
  console.log(`  ${withType > 0 ? "HAVE   " : "empty  "}  invoices with a type (REPAIR/SALE): ${withType} of ${inv.length}`);
  console.log(`  ${withName > 0 ? "HAVE   " : "empty  "}  invoices with a customer name: ${withName} of ${inv.length}`);
}

console.log("\n=====================================\n");
console.log("Next - restore this data (dry run first, nothing changes):\n");
console.log(`  node peyvo-recover/restore-from-backup.mjs "${path}"\n`);
