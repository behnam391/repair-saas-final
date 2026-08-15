import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UnauthorizedError } from "@/lib/tenant";
import { requireCapability } from "@/lib/authz";
import { requestPayment } from "@/lib/payments";
import { logCaught } from "@/lib/logError";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MIN_TOPUP = 10000; // 10,000 toman minimum
const MAX_TOPUP = 100000000; // 100M toman ceiling (sanity guard)

const Schema = z.object({
  amountToman: z.number().int().min(MIN_TOPUP).max(MAX_TOPUP),
});

// POST /api/wallet/topup { amountToman } — start a wallet top-up of an
// arbitrary amount through the active gateway. Creates a PENDING TOPUP row and
// returns a payUrl; the balance is credited only after the gateway callback
// verifies the payment (see /api/wallet/callback).
export async function POST(req: NextRequest) {
  try {
    // Money movement (starts a wallet top-up payment) — OWNER only.
    const { shopId } = await requireCapability("wallet.write");
    const { amountToman } = Schema.parse(await req.json());
    const origin = req.nextUrl.origin;

    const txn = await (db as any).walletTransaction.create({
      data: { shopId, type: "TOPUP", amount: amountToman, status: "PENDING", note: "شارژ کیف پول" },
    });

    const { provider, token, payUrl } = await requestPayment({
      amountToman,
      description: `شارژ کیف پول تعمیرگاه — ${amountToman.toLocaleString("en-US")} تومان`,
      callbackUrl: `${origin}/api/wallet/callback?txnId=${txn.id}`,
      orderId: txn.id,
    });

    await (db as any).walletTransaction.update({ where: { id: txn.id }, data: { authority: token, paymentProvider: provider } });
    return NextResponse.json({ payUrl });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", message: "مبلغ نامعتبر است (حداقل ۱۰٬۰۰۰ تومان)" }, { status: 400 });
    await logCaught(e, { source: "payment", path: "/api/wallet/topup", method: "POST" });
    return NextResponse.json({ error: "internal_error", message: (e as Error).message }, { status: 500 });
  }
}
