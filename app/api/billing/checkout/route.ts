import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { requestPayment } from "@/lib/zarinpal";
import { PLANS, DURATIONS, priceForDuration, type PlanKey, type DurationKey } from "@/lib/plans";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  plan: z.enum(["pro", "business"]),
  duration: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { plan, duration } = CheckoutSchema.parse(await req.json());
    const planInfo = PLANS[plan as PlanKey];
    const durationInfo = DURATIONS[duration as DurationKey];
    const amount = priceForDuration(plan as PlanKey, duration as DurationKey);

    const origin = req.nextUrl.origin;
    const sub = await db.subscription.create({
      data: { shopId, plan, months: durationInfo.months, amount, status: "PENDING" },
    });

    const { authority, payUrl } = await requestPayment({
      amountToman: amount,
      description: `ارتقا به پلن ${planInfo.label} (${durationInfo.label}) — تعمیرگاه`,
      callbackUrl: `${origin}/api/billing/callback?subId=${sub.id}`,
    });

    await db.subscription.update({ where: { id: sub.id }, data: { authority } });

    return NextResponse.json({ payUrl });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error", message: (e as Error).message }, { status: 500 });
  }
}
