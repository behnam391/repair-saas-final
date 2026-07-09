import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { requestPayment } from "@/lib/zarinpal";
import { PLANS, type PlanKey } from "@/lib/plans";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({ plan: z.enum(["pro", "business"]) });

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { plan } = CheckoutSchema.parse(await req.json());
    const planInfo = PLANS[plan as PlanKey];

    const origin = req.nextUrl.origin;
    const sub = await db.subscription.create({
      data: { shopId, plan, amount: planInfo.priceToman, status: "PENDING" },
    });

    const { authority, payUrl } = await requestPayment({
      amountToman: planInfo.priceToman,
      description: `ارتقا به پلن ${planInfo.label} — تعمیرگاه`,
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
