import { NextResponse } from "next/server";
import { getPricing } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET /api/pricing — public, no auth. Returns the effective (possibly
// admin-overridden) subscription plans + duration discounts so the shop-facing
// billing page shows the same prices that checkout will actually charge.
// Prices are public marketing info, so there's nothing sensitive here.
export async function GET() {
  const pricing = await getPricing();
  return NextResponse.json(pricing);
}
