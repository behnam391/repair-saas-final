import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { UnauthorizedError } from "@/lib/tenant";
import { BazaarPaymentProvider, getSubscriptionService } from "@/lib/subscription";
import { resolveSku } from "@/lib/subscription/skus";

export const dynamic = "force-dynamic";
const Schema = z.object({
  intentId: z.string().min(1).max(100).optional(),
  purchase: z.object({
    sku: z.string().min(1).max(160), token: z.string().min(1).max(5000),
    orderId: z.string().max(500).optional().nullable(), developerPayload: z.string().min(1).max(500),
    purchaseTime: z.number().optional(), originalJson: z.string().min(2).max(20000), signature: z.string().min(1).max(10000),
  }),
});
const MESSAGE: Record<string, string> = {
  unknown_sku: "محصول خریداری‌شده شناخته نشد.", missing_purchase_data: "اطلاعات خرید بازار ناقص است.",
  bazaar_not_configured: "کلید پرداخت بازار هنوز در پنل مدیریت ثبت نشده است.", invalid_signature: "امضای رسید بازار معتبر نیست.",
  invalid_receipt: "رسید خرید بازار معتبر نیست.", receipt_mismatch: "اطلاعات رسید با خرید مطابقت ندارد.",
  package_mismatch: "رسید متعلق به این برنامه نیست.", purchase_not_completed: "خرید هنوز در بازار تکمیل نشده است.",
  developer_payload_mismatch: "شناسه امنیتی خرید معتبر نیست.",
};

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireCapability("billing.write");
    const { intentId, purchase } = Schema.parse(await req.json());
    const skuInfo = resolveSku(purchase.sku);
    if (!skuInfo) return NextResponse.json({ error: "unknown_sku", message: MESSAGE.unknown_sku }, { status: 400 });
    const intent = intentId
      ? await db.subscription.findFirst({ where: { id: intentId, shopId, paymentProvider: "bazaar" } })
      : await db.subscription.findFirst({ where: { shopId, paymentProvider: "bazaar", authority: purchase.developerPayload }, orderBy: { createdAt: "desc" } });
    if (!intent?.authority) return NextResponse.json({ error: "intent_not_found", message: "درخواست خرید این حساب پیدا نشد." }, { status: 404 });
    if (intent.authority !== purchase.developerPayload) return NextResponse.json({ error: "payload_mismatch", message: MESSAGE.developer_payload_mismatch }, { status: 400 });
    if (intent.plan !== skuInfo.plan || intent.months !== skuInfo.months) return NextResponse.json({ error: "sku_mismatch", message: "محصول بازار با درخواست خرید مطابقت ندارد." }, { status: 400 });

    const verified = await new BazaarPaymentProvider().verify({
      shopId, sku: purchase.sku, token: purchase.token, expectedPayload: intent.authority,
      originalJson: purchase.originalJson, signature: purchase.signature, amountToman: intent.amount, orderId: purchase.orderId || undefined,
    });
    if (!verified.ok) return NextResponse.json({ error: verified.reason, message: MESSAGE[verified.reason] ?? "تأیید خرید بازار ناموفق بود." }, { status: verified.reason === "bazaar_not_configured" ? 503 : 400 });
    const activation = await getSubscriptionService().activate(verified.purchase);
    await db.subscription.update({ where: { id: intent.id }, data: { status: "PAID", refId: verified.purchase.externalRef } });
    return NextResponse.json({ ok: true, status: activation.status, plan: activation.plan, months: activation.months, expiresAt: activation.expiresAt, needsConsume: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", message: "اطلاعات خرید معتبر نیست." }, { status: 400 });
    console.error("[bazaar] verify/activate failed", error);
    return NextResponse.json({ error: "internal_error", message: "تأیید خرید ناموفق بود." }, { status: 500 });
  }
}
