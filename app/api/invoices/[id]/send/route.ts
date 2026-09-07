import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { sendRepairNotification } from "@/lib/sms";
import { getPublicOrigin } from "@/lib/public-url";
import { rateLimit } from "@/lib/ratelimit";
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId } = await requireDeskSession();
    const invoice = await db.invoice.findFirst({ where: { id: params.id, shopId }, include: { ticket: { include: { customer: true } }, shop: true } });
    if (!invoice?.ticket?.customer.phone) return NextResponse.json({ error: "فاکتور یا شماره مشتری یافت نشد" }, { status: 404 });
    const limit = await rateLimit(`invoice-send:${invoice.id}`, 1, 60000);
    if (!limit.ok) return NextResponse.json({ error: "برای ارسال مجدد یک دقیقه صبر کنید" }, { status: 429 });
    const result = await sendRepairNotification(invoice.ticket.customer.phone, `${invoice.shop.name}\nفاکتور #${invoice.ticket.no}\nمبلغ کل: ${invoice.total.toLocaleString("fa-IR")} تومان\nپرداخت‌شده: ${invoice.paidAmount.toLocaleString("fa-IR")} تومان\nمانده: ${Math.max(0, invoice.total - invoice.paidAmount).toLocaleString("fa-IR")} تومان\nمشاهده: ${getPublicOrigin(req.nextUrl.origin)}/pay/${invoice.id}`);
    return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 503 });
  } catch (e) { return NextResponse.json({ error: e instanceof UnauthorizedError ? "دسترسی ندارید" : "ارسال تأیید نشد؛ قبل از تکرار، گزارش کاوه‌نگار را بررسی کنید" }, { status: e instanceof UnauthorizedError ? 403 : 502 }); }
}
