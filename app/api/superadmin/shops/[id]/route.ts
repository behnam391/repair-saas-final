import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { PLANS, PlanKey } from "@/lib/plans";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  active: z.boolean().optional(),
  supportAccessEnabled: z.boolean().optional(),
  // Directly gift a free subscription: set the plan and extend expiry by
  // `grantMonths` months (from current expiry if still active, else now).
  grantPlan: z.enum(["free", "pro", "business"]).optional(),
  grantMonths: z.number().int().min(1).max(36).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = UpdateSchema.parse(await req.json());

    // Handle a direct subscription gift separately from the simple toggles.
    if (body.grantPlan) {
      const planInfo = PLANS[body.grantPlan as PlanKey];
      const months = body.grantMonths ?? 1;
      const shopNow = await db.shop.findUniqueOrThrow({ where: { id: params.id } });
      const now = new Date();
      let data: any = { plan: body.grantPlan, monthlyQuota: planInfo.monthlyQuota };
      if (body.grantPlan === "free") {
        data.planExpiresAt = null;
      } else {
        const base = shopNow.planExpiresAt && shopNow.planExpiresAt > now ? shopNow.planExpiresAt : now;
        const newExpiry = new Date(base);
        newExpiry.setMonth(newExpiry.getMonth() + months);
        data.planExpiresAt = newExpiry;
      }
      const shop = await db.shop.update({ where: { id: params.id }, data });
      return NextResponse.json({ shop });
    }

    const { active, supportAccessEnabled } = body;
    const shop = await db.shop.update({ where: { id: params.id }, data: { active, supportAccessEnabled } });
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
