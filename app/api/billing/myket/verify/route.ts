import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { UnauthorizedError } from "@/lib/tenant";
import { getSubscriptionService, MyketPaymentProvider } from "@/lib/subscription";
import { resolveSku } from "@/lib/subscription/skus";

export const dynamic = "force-dynamic";

const Schema = z.object({
  intentId: z.string().min(1).max(100).optional(),
  purchase: z.object({
    sku: z.string().min(1).max(160),
    token: z.string().min(1).max(5000),
    orderId: z.string().max(500).optional().nullable(),
    developerPayload: z.string().min(1).max(500),
    purchaseTime: z.number().optional(),
  }),
});

const MESSAGE: Record<string, string> = {
  unknown_sku: "محصول خریداری‌شده شناخته نشد.",
  missing_purchase_data: "اطلاعات خرید مایکت ناقص است.",
  myket_not_configured: "تنظیمات پرداخت مایکت هنوز کامل نشده است.",
  myket_unreachable: "ارتباط با مایکت برقرار نشد؛ دوباره تلاش کنید.",
  myket_unverified: "مایکت این خرید را تأیید نکرد.",
  purchase_not_completed: "خرید هنوز در مایکت تکمیل نشده است.",
  developer_payload_mismatch: "شناسه امنیتی خرید معتبر نیست.",
};

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireCapability("billing.write");
    const { intentId, purchase } = Schema.parse(await req.json());
    const skuInfo = resolveSku(purchase.sku);
    if (!skuInfo) {
      return NextResponse.json({ error: "unknown_sku", message: MESSAGE.unknown_sku }, { status: 400 });
    }

    // Restore after reinstall has no locally remembered intentId, so the
    // server-issued developerPayload is the fallback lookup key.
    const intent = intentId
      ? await db.subscription.findFirst({ where: { id: intentId, shopId, paymentProvider: "myket" } })
      : await db.subscription.findFirst({
          where: { shopId, paymentProvider: "myket", authority: purchase.developerPayload },
          orderBy: { createdAt: "desc" },
        });

    if (!intent || !intent.authority) {
      return NextResponse.json({ error: "intent_not_found", message: "درخواست خرید متعلق به این حساب پیدا نشد." }, { status: 404 });
    }
    if (intent.authority !== purchase.developerPayload) {
      return NextResponse.json({ error: "payload_mismatch", message: MESSAGE.developer_payload_mismatch }, { status: 400 });
    }
    if (intent.plan !== skuInfo.plan || intent.months !== skuInfo.months) {
      return NextResponse.json({ error: "sku_mismatch", message: "محصول مایکت با درخواست خرید مطابقت ندارد." }, { status: 400 });
    }

    const provider = new MyketPaymentProvider();
    const verified = await provider.verify({
      shopId,
      sku: purchase.sku,
      token: purchase.token,
      expectedPayload: intent.authority,
      amountToman: intent.amount,
      orderId: purchase.orderId || undefined,
    });
    if (!verified.ok) {
      const status = ["myket_not_configured", "myket_unreachable"].includes(verified.reason) ? 503 : 400;
      return NextResponse.json({ error: verified.reason, message: MESSAGE[verified.reason] ?? "تأیید خرید ناموفق بود." }, { status });
    }

    const activation = await getSubscriptionService().activate(verified.purchase);
    await db.subscription.update({
      where: { id: intent.id },
      data: {
        status: "PAID",
        refId: verified.purchase.externalRef,
      },
    });

    return NextResponse.json({
      ok: true,
      status: activation.status,
      plan: activation.plan,
      months: activation.months,
      expiresAt: activation.expiresAt,
      needsConsume: true,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_input", message: "اطلاعات خرید معتبر نیست." }, { status: 400 });
    }
    console.error("[myket] verify/activate failed", error);
    return NextResponse.json({ error: "internal_error", message: "تأیید خرید ناموفق بود." }, { status: 500 });
  }
}
