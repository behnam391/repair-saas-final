import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { rateLimit } from "@/lib/ratelimit";
import { sendBaleInvoiceImage } from "@/lib/sms";
export const maxDuration = 30;
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireDeskSession();
    const invoice = await db.invoice.findFirst({ where: { id: params.id, shopId }, include: { ticket: { include: { customer: true } }, shop: true } });
    const phone = invoice?.ticket?.customer.phone || invoice?.customerPhone;
    if (!invoice || !phone) return NextResponse.json({ error: "فاکتور یا شماره مشتری پیدا نشد" }, { status: 404 });
    const limit = await rateLimit(`invoice-image:${shopId}:${params.id}`, 1, 60000);
    if (!limit.ok) return NextResponse.json({ error: "برای ارسال مجدد یک دقیقه صبر کنید" }, { status: 429 });
    if (Number(req.headers.get("content-length") || 0) > 2200000) return NextResponse.json({ error: "تصویر باید کمتر از ۲ مگابایت باشد" }, { status: 413 });
    const file = (await req.formData()).get("image");
    if (!(file instanceof File) || file.type !== "image/jpeg" || file.size > 2000000 || file.size < 3) return NextResponse.json({ error: "تصویر JPEG معتبر لازم است؛ حداکثر ۲ مگابایت" }, { status: 400 });
    const bytes = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) return NextResponse.json({ error: "قالب تصویر معتبر نیست" }, { status: 400 });
    const result = await sendBaleInvoiceImage(phone, `${invoice.shop.name}\nتصویر فاکتور ${invoice.id.slice(0,8)}\nجمع کل: ${invoice.total.toLocaleString("fa-IR")} تومان`, file);
    return NextResponse.json({ ok: result.ok, message: "درخواست ارسال پذیرفته شد؛ این وضعیت تأیید تحویل نیست" }, { status: result.ok ? 200 : 503 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof UnauthorizedError ? "دسترسی ندارید" : "ارسال تصویر تأیید نشد؛ ممکن است رسانه در انتظار بررسی باشد. قبل از تکرار گزارش کاوه‌نگار را بررسی کنید." }, { status: e instanceof UnauthorizedError ? 403 : 502 });
  }
}
