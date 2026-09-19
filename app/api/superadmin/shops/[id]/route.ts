import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { getPricing, PlanKey } from "@/lib/plans";
import { deleteShopCascade } from "@/lib/cascade";
import { revokeSessionsForShop } from "@/lib/login-sessions";
import { SHOP_SERVICES, parseShopServices, serializeShopServices, shopHome } from "@/lib/shop-services";
import { INDUSTRY_WORKSPACES } from "@/lib/industry-workspaces";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  active: z.boolean().optional(),
  supportAccessEnabled: z.boolean().optional(),
  // Directly gift a free subscription: set the plan and extend expiry by
  // `grantMonths` months (from current expiry if still active, else now).
  grantPlan: z.enum(["free", "pro", "business"]).optional(),
  grantMonths: z.number().int().min(1).max(36).optional(),
  serviceCategories: z.array(z.enum(SHOP_SERVICES)).min(1).optional(),
});

const CATEGORY_LABELS: Record<(typeof SHOP_SERVICES)[number], string> = {
  MOBILE: "تعمیرات موبایل",
  COMPUTER: "تعمیرات کامپیوتر",
  APPLIANCE: INDUSTRY_WORKSPACES.appliances.title,
  FACILITIES: INDUSTRY_WORKSPACES.facilities.title,
  VEHICLE: INDUSTRY_WORKSPACES.vehicles.title,
  INDUSTRIAL: INDUSTRY_WORKSPACES.industrial.title,
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId } = await requireSuperAdmin("shops");
    const body = UpdateSchema.parse(await req.json());

    // Handle a direct subscription gift separately from the simple toggles.
    if (body.grantPlan) {
      const pricing = await getPricing();
      const planInfo = pricing.plans[body.grantPlan as PlanKey];
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

    if (body.serviceCategories) {
      const current = await db.shop.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, serviceCategories: true },
      });
      if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const previous = parseShopServices(current.serviceCategories);
      const nextSerialized = serializeShopServices(body.serviceCategories);
      const next = parseShopServices(nextSerialized);
      if (serializeShopServices(previous) === nextSerialized) {
        return NextResponse.json({ shop: current, notified: 0 });
      }

      const managers = await db.user.findMany({
        where: { shopId: params.id, role: "OWNER", active: true },
        select: { id: true },
      });
      const oldLabel = previous.map((key) => CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS]).join("، ");
      const newLabel = next.map((key) => CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS]).join("، ");
      const message = `دسته شغلی فروشگاه «${current.name}» توسط مدیریت سامانه از «${oldLabel}» به «${newLabel}» اصلاح شد. از این پس داشبورد و پذیرش متناسب با دسته جدید نمایش داده می‌شود.`;

      const shop = await db.$transaction(async (tx) => {
        const updated = await tx.shop.update({
          where: { id: params.id },
          data: { serviceCategories: nextSerialized },
        });
        if (managers.length) {
          await tx.notification.createMany({
            data: managers.map(({ id }) => ({
              userId: id,
              title: "دسته شغلی فروشگاه اصلاح شد",
              message,
              link: shopHome(nextSerialized),
            })),
          });
        }
        return updated;
      });
      return NextResponse.json({ shop, notified: managers.length });
    }

    const { active, supportAccessEnabled } = body;
    const shop = await db.shop.update({ where: { id: params.id }, data: { active, supportAccessEnabled } });
    if (active === false) {
      await revokeSessionsForShop(params.id, adminId, "SHOP_DISABLED");
    }
    return NextResponse.json({ shop });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// DELETE /api/superadmin/shops/:id — permanently remove a shop and ALL its
// data (super-admin only). Irreversible — meant for clearing test shops.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId } = await requireSuperAdmin("shops");
    const shop = await db.shop.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await deleteShopCascade(params.id, adminId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[superadmin] shop delete failed", e);
    return NextResponse.json({ error: "internal_error", message: "حذف مغازه ناموفق بود" }, { status: 500 });
  }
}
