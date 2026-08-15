import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UnauthorizedError } from "@/lib/tenant";
import { requireCapability } from "@/lib/authz";
import { requestPayment } from "@/lib/payments";
import { getPricing, priceForDuration, extendPlanExpiry, type PlanKey, type DurationKey } from "@/lib/plans";
import { logCaught } from "@/lib/logError";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  plan: z.enum(["pro", "business"]),
  duration: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).default(1),
  // "gateway" (default): redirect to the payment gateway. "wallet": pay from
  // the shop's prepaid wallet balance immediately, no gateway round-trip.
  payWith: z.enum(["gateway", "wallet"]).default("gateway"),
});

export async function POST(req: NextRequest) {
  try {
    // Money movement (starts a subscription / spends the wallet) — OWNER only.
    const { shopId } = await requireCapability("billing.write");
    const { plan, duration, payWith } = CheckoutSchema.parse(await req.json());
    // Effective, possibly admin-overridden pricing — the amount charged must
    // reflect the price set in the super-admin panel, not the code default.
    const pricing = await getPricing();
    const planInfo = pricing.plans[plan as PlanKey];
    const durationInfo = pricing.durations[duration as DurationKey];
    const amount = priceForDuration(plan as PlanKey, duration as DurationKey, pricing);

    // ── Pay from wallet: settle instantly, no gateway. ──
    if (payWith === "wallet") {
      try {
        await db.$transaction(async (tx) => {
          const shop = await (tx as any).shop.findUniqueOrThrow({ where: { id: shopId } });
          const balance = shop.walletBalance ?? 0;
          if (balance < amount) throw new Error("INSUFFICIENT");
          const newBalance = balance - amount;
          await (tx as any).subscription.create({
            data: { shopId, plan, months: durationInfo.months, amount, status: "PAID", paymentProvider: "wallet", refId: "wallet" },
          });
          await (tx as any).walletTransaction.create({
            data: {
              shopId, type: "SPEND", amount, status: "PAID",
              note: `اشتراک ${planInfo.label} (${durationInfo.label})`, balanceAfter: newBalance,
            },
          });
          await (tx as any).shop.update({
            where: { id: shopId },
            data: {
              plan,
              planExpiresAt: extendPlanExpiry(shop.planExpiresAt, durationInfo.months),
              monthlyQuota: planInfo.monthlyQuota,
              walletBalance: newBalance,
            },
          });
        });
      } catch (err) {
        if (err instanceof Error && err.message === "INSUFFICIENT") {
          return NextResponse.json({ error: "insufficient_balance", message: "موجودی کیف پول کافی نیست. ابتدا کیف پول را شارژ کنید." }, { status: 400 });
        }
        throw err;
      }
      return NextResponse.json({ paidFromWallet: true });
    }

    const origin = req.nextUrl.origin;
    const sub = await db.subscription.create({
      data: { shopId, plan, months: durationInfo.months, amount, status: "PENDING" },
    });

    const { provider, token, payUrl } = await requestPayment({
      amountToman: amount,
      description: `ارتقا به پلن ${planInfo.label} (${durationInfo.label}) — تعمیرگاه`,
      callbackUrl: `${origin}/api/billing/callback?subId=${sub.id}`,
      orderId: sub.id,
    });

    await db.subscription.update({ where: { id: sub.id }, data: { authority: token, paymentProvider: provider } as any });

    return NextResponse.json({ payUrl });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    await logCaught(e, { source: "payment", path: "/api/billing/checkout", method: "POST" });
    return NextResponse.json({ error: "internal_error", message: (e as Error).message }, { status: 500 });
  }
}
