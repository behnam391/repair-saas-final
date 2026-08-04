# چرا همه‌جا می‌گوید «رمز عبور اشتباه است»

## خلاصه

کدِ سایت سالم است. **دیتابیس** با schema هماهنگ نیست.

اسکریپت build پروژه این است:

```
prisma generate && prisma db push --skip-generate && next build
```

یعنی هر بار که روی ورسل دیپلوی می‌شود، **قبل از build**، دستور `prisma db push`
ساختار دیتابیس را با `schema.prisma` یکی می‌کند.

وقتی فایل زیپ پوش شد، `schema.prisma` خراب بود (۷۹۳ خط به‌جای ۱۱۲۰).
همان لحظه `prisma db push` روی دیتابیس **اصلی** اجرا شد و این ستون‌ها را پاک کرد:

- `User.specialty`
- `PlatformCustomer.passwordHash` ، `email` ، `city` ، `province` ، `active`
- `Invoice.type` ، `customerName` ، `customerPhone` ، `paymentAuthority` ، `paymentRefId`
- `InventoryItem.category` ، `description` ، `deviceModel` ، `imageUrl`
- `MarketListing.imageUrl` ، `Message.imageUrl` ، `DealerInventory.imageUrl`
- و جدول‌های `InvoiceItem` و `CustomerPasswordResetToken` را کلاً حذف کرد

نکته‌ی کلیدی: `db push` **قبل از** `next build` اجرا می‌شود.
پس حتی اگر build شکست خورده و دیپلوی بالا نیامده باشد، **دیتابیس از قبل تغییر کرده**.

## چرا «رمز اشتباه» برای همه؟

Prisma وقتی `db.user.findUnique(...)` می‌زند، در SQL **همه‌ی ستون‌ها** را نام می‌برد،
از جمله `specialty`. آن ستون دیگر در دیتابیس نیست، پس کوئری خطا می‌دهد.
NextAuth هر خطایی در `authorize` را «ورود ناموفق» حساب می‌کند و صفحه‌ی لاگین
پیام ثابتِ «شماره موبایل یا رمز عبور اشتباه است» را نشان می‌دهد.

برای همین **هر ورودی، در هر بخش**، همین پیام را می‌گیرد — ربطی به رمز ندارد.

## قدم به قدم

### ۱) اول ببین واقعاً چه چیزی گم شده (فقط می‌خوانَد، بی‌خطر)

```
node peyvo-recover/db-doctor.mjs
```

`DATABASE_URL` را خودش از `.env` می‌خوانَد.
اگر `.env` محلی به دیتابیسِ اصلی وصل نیست، آدرس دیتابیسِ اصلی را این‌طور بده:

```
$env:DATABASE_URL="postgres://..." ; node peyvo-recover/db-doctor.mjs
```

### ۲) ستون‌ها و جدول‌ها را برگردان

اول بدون اجرا ببین چه می‌کند:

```
node peyvo-recover/db-fix.mjs
```

بعد اجرای واقعی:

```
node peyvo-recover/db-fix.mjs --apply
```

این فایل **فقط ADD و CREATE** دارد — هیچ `DROP` یا `DELETE` ای در آن نیست،
پس روی داده‌های موجود دست نمی‌گذارد.

روی یک دیتابیس تستی (پستگرس ۱۶) شبیه‌سازی و تست شد:
هر ۲۷ دستور بدون خطا اجرا شد، هر ۱۸ ستون برگشت، هر دو جدول ساخته شد،
و داده‌های `User` / `Invoice` / `InventoryItem` دست‌نخورده ماندند.

### ۳) دوباره چک کن، بعد دیپلوی

```
node peyvo-recover/db-doctor.mjs
```

اگر همه ✅ شد، در ورسل یک **Redeploy** بزن و وارد پنل شو.

### ۴) فایل مایگریشن خراب را پاک کن

این فایل از روی schema خرابِ زیپ ساخته شده و هنوز در مخزن است.
build از `db push` استفاده می‌کند نه `migrate deploy`، پس خودبه‌خود اجرا نمی‌شود —
ولی یک مین است، بگذار پاکش کنیم:

```
git rm -r -f prisma/migrations/20260804095239_customer_dashboard
git commit -m "Remove destructive migration generated from the corrupted schema"
git push
```

## چه چیزی با اسکریپت برنمی‌گردد

اسکریپت **ستون** را برمی‌گرداند، ولی **محتوای** ستونِ پاک‌شده را نه — آن داده رفته.
مهم‌ترینش:

- `PlatformCustomer.passwordHash` → خالی برمی‌گردد، یعنی مشتری‌ها باید
  «رمز عبور را فراموش کرده‌ام» بزنند… **مگر اینکه از بکاپ برگردانیم.**
- `User.specialty` → خالی، دستی دوباره تنظیم می‌شود
- ردیف‌های `InvoiceItem` (اقلام فاکتورهای فروش) → از بکاپ
- `Invoice.type` → همه `REPAIR` می‌شوند؛ فاکتورهای فروش باید از بکاپ برگردند

> ✅ **رمز کاربران مغازه دست‌نخورده است.** مایگریشن `User.passwordHash` را
> حذف نکرده بود. به‌محض برگشتن ستون `specialty`، ورود مغازه‌ها درست می‌شود.

## بکاپ تلگرام — آره، دقیقاً به‌درد می‌خورد

`lib/backup.ts` از **هر ۴۴ مدل** یک `findMany()` کامل می‌گیرد، از جمله همان‌هایی
که این‌جا نابود شدند: `platformCustomer` (با `passwordHash`)، `user` (با `specialty`)،
`invoiceItem`، `customerPasswordResetToken`، `expense`، `walletTransaction`،
`giftCode`، `ticketMessage`، `errorLog`، `shopPartnership`، `shopReferral`.

ببین داخل فایلت واقعاً چه هست (به دیتابیس وصل نمی‌شود):

```
node peyvo-recover/backup-inspect.mjs "C:\Users\Behnam\Downloads\peyvo-backup-2026-08-04.json"
```

خروجی‌اش را برایم بفرست تا اسکریپت بازگردانیِ داده را دقیق بنویسم.
شرط اصلی این است که تاریخ `exportedAt` **قبل از ساعت ۱۲:۳۶ امروز** باشد.

## یک چیز که باید عوض شود

`prisma db push` داخل اسکریپت build یعنی «هر چه در schema است، بی‌چون‌وچرا روی
دیتابیس اصلی اعمال کن». یک فایل زیپِ اشتباهی توانست با همین مسیر دیتابیس را خالی کند.
بعد از اینکه سایت برگشت، پیشنهادم این است که به `prisma migrate deploy` مهاجرت کنیم
تا هر تغییر ساختاری اول به‌صورت فایل مایگریشن بازبینی شود. جدا در موردش حرف می‌زنیم.

## اگر دیپلوی هنوز خطا داد

اگر ورسل در مرحله‌ی `prisma db push` از جدول `CustomerOtp` شکایت کرد،
آن جدول ساخته‌ی همان فایل زیپ است و هیچ استفاده‌ای ندارد:

```sql
DROP TABLE IF EXISTS "CustomerOtp";
```

(این تنها دستور DROP در کل این بسته است و عمداً از اسکریپت بیرون گذاشته شده
تا خودت آگاهانه اجرایش کنی.)
