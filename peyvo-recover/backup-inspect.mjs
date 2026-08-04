/**
 * peyvo backup-inspect — فقط فایل بکاپ را می‌خوانَد و می‌گوید چه چیزی داخلش هست.
 * به دیتابیس اصلاً وصل نمی‌شود.
 *
 * اجرا:  node peyvo-recover/backup-inspect.mjs "C:\\Users\\Behnam\\Downloads\\peyvo-backup-2026-08-04.json"
 */
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("\nمسیر فایل بکاپ را بده. مثال:");
  console.error('  node peyvo-recover/backup-inspect.mjs "C:\\Users\\Behnam\\Downloads\\peyvo-backup-2026-08-04.json"\n');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error(`\n❌ فایل خوانده نشد: ${e.message}\n`);
  process.exit(1);
}

console.log("\n══════════ محتوای فایل بکاپ ══════════\n");
console.log(`  اپ:        ${data.app ?? "—"}`);
console.log(`  نسخه:      ${data.version ?? "—"}`);
console.log(`  تاریخ تهیه: ${data.exportedAt ?? "—"}`);

const models = data.models ?? {};
const rows = [];
for (const [name, val] of Object.entries(models)) {
  rows.push([name, Array.isArray(val) ? val.length : `⚠️ ${JSON.stringify(val)}`]);
}
rows.sort((a, b) => (typeof b[1] === "number" ? b[1] : -1) - (typeof a[1] === "number" ? a[1] : -1));

console.log(`\n  ${rows.length} مدل داخل فایل:\n`);
for (const [name, n] of rows) console.log(`    ${String(n).padStart(6)}  ${name}`);

// آن چیزهایی که مایگریشنِ خراب نابود کرده بود:
console.log("\n── چیزهایی که با فایل زیپ از دست رفت، و در این بکاپ هست ──\n");

const check = (model, label, test) => {
  const arr = models[model];
  if (!Array.isArray(arr)) {
    console.log(`  ❌ ${label}: در این بکاپ نیست`);
    return;
  }
  if (!test) {
    console.log(`  ${arr.length > 0 ? "✅" : "▫️"} ${label}: ${arr.length} رکورد`);
    return;
  }
  const ok = arr.filter(test).length;
  console.log(`  ${ok > 0 ? "✅" : "▫️"} ${label}: ${ok} از ${arr.length} رکورد`);
};

check("platformCustomer", "مشتریان پلتفرم با رمز عبور", (r) => r.passwordHash);
check("user", "کاربران مغازه با رمز عبور", (r) => r.passwordHash);
check("user", "کاربران با تخصص (specialty)", (r) => r.specialty);
check("invoiceItem", "ردیف‌های فاکتور (InvoiceItem)");
check("customerPasswordResetToken", "کدهای بازیابی رمز مشتری");
check("expense", "هزینه‌ها (Expense)");
check("walletTransaction", "تراکنش‌های کیف پول");
check("giftCode", "کدهای هدیه");
check("ticketMessage", "پیام‌های تیکت");
check("errorLog", "لاگ خطاها");
check("shopPartnership", "همکاری بین مغازه‌ها");
check("shopReferral", "معرفی مغازه‌ها");

const inv = models.invoice;
if (Array.isArray(inv)) {
  const withType = inv.filter((r) => r.type).length;
  const withName = inv.filter((r) => r.customerName).length;
  console.log(`  ${withType > 0 ? "✅" : "▫️"} فاکتورها با نوع (REPAIR/SALE): ${withType} از ${inv.length}`);
  console.log(`  ${withName > 0 ? "✅" : "▫️"} فاکتورها با نام مشتری: ${withName} از ${inv.length}`);
}

console.log("\n══════════════════════════════════════\n");
console.log("این خروجی را برایم بفرست تا اسکریپت بازگردانیِ داده را دقیق بنویسم.\n");
