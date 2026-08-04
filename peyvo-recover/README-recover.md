# بازگردانی پروژه بعد از فایل زیپ اشتباهی

## چه اتفاقی افتاد

کامیت `a76f05f` با پیام **«Push N75»** (امروز ساعت ۱۲:۳۶) محتوای فایل زیپ را روی پروژه نوشته است.
این کامیت **۸۰ فایل** را به نسخه‌ی قدیمی‌تر برگرداند و **۷ فایل اضافی** هم اضافه کرد.
مجموعاً حدود **۴۸۰۰ خط کد** حذف شد.

از جمله چیزهایی که از دست رفت:

- `prisma/schema.prisma` از ۱۱۲۰ خط به ۷۹۳ خط رسید — **۱۲ مدل و ۳ enum حذف شد**
  (`InvoiceItem`, `Expense`, `WalletTransaction`, `GiftCode`, `TicketMessage`,
  `SignupVerification`, `ErrorLog`, `ShopPartnership`, `ShopReferral`,
  `CustomerPasswordResetToken` و …)
- `app/page.tsx` (صفحه‌ی اصلی) از ۱۹۱ خط به ۵ خط
- `lib/sms.ts` (کاوه‌نگار) از ۱۷۰ خط به ۵۸ خط
- `lib/device-catalog.ts` از ۲۴۴ خط به ۲۵ خط
- `app/superadmin/settings/page.tsx` از ۴۳۷ خط به ۱۰۵ خط
- `lib/auth.ts`, `lib/plans.ts`, `lib/tenant.ts`, `components/DashboardNav.tsx` و ۷۰ فایل دیگر

کامیت‌های بعدی (`846c903`, `0ace144`, `8e81101`) سالم هستند و **دست نمی‌خورند** —
یعنی کارِ گرافیکی جدید (BottomNav، OtpInput، Motion، globals.css) حفظ می‌شود.

## دستورهای بازگردانی

در پوشه‌ی `repair-saas-final` این‌ها را به‌ترتیب اجرا کن:

```
git checkout a76f05f~1 --pathspec-from-file=peyvo-recover/restore-list.txt
git rm -f --pathspec-from-file=peyvo-recover/junk-list.txt
git add -A
git commit -m "Restore project state after accidental zip overwrite (revert N75)"
git push
```

`a76f05f~1` یعنی «کامیت قبل از کامیت خراب» — همان `dd949cf` (Push N72).

۷ فایل دیگر که نسخه‌شان از N72 هم جدیدتر بود، جداگانه برایت روی پروژه نوشته شد
و با `git add -A` خودکار وارد کامیت می‌شوند.

## بعد از push

```
npm install
npm run dev
```

## هشدار مهم درباره‌ی دیتابیس

فایل `prisma/migrations/20260804095239_customer_dashboard/migration.sql`
(کامیت `846c903`، امروز ۱۳:۲۳) از روی همان schema خرابِ زیپ ساخته شده و **مخرب** است.
اگر اجرا شود این‌ها را پاک می‌کند:

- جدول‌های `InvoiceItem` و `CustomerPasswordResetToken` (`DROP TABLE`)
- ستون‌های `Invoice.customerName`, `Invoice.customerPhone`, `Invoice.type`,
  `Invoice.paymentAuthority`, `Invoice.paymentRefId`
- ستون‌های `InventoryItem.category/description/deviceModel/imageUrl`
- ستون‌های `PlatformCustomer.email/passwordHash/city/province/active`
- `MarketListing.imageUrl`, `Message.imageUrl`, `DealerInventory.imageUrl`

اگر این مایگریشن روی دیتابیسِ اصلی اجرا نشده، این فایل را قبل از هر کاری پاک کن:

```
git rm -r -f prisma/migrations/20260804095239_customer_dashboard
```

اگر اجرا شده، باید از بکاپ برگردانی — با من در میان بگذار.
