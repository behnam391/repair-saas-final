import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEVICE_BRANDS } from "@/lib/device-catalog";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { preprocessPhone } from "@/lib/phone";
import { encryptSecretOrPassthrough } from "@/lib/crypto";
import { parseServiceCategories } from "@/lib/device-category";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  customerName: z.string().min(1),
  // The customer types this on a kiosk tablet, very often with a Farsi
  // keyboard. It is the number the shop calls back and texts. See lib/phone.ts.
  customerPhone: z.preprocess(preprocessPhone, z.string().min(5)),
  deviceModel: z.string().min(1),
  deviceCategory: z.enum(["MOBILE", "COMPUTER"]).default("MOBILE"),
  deviceType: z.enum(["LAPTOP", "DESKTOP", "ALL_IN_ONE", "MINI_PC", "OTHER"]).optional(),
  deviceBrand: z.string().max(80).optional(),
  operatingSystem: z.string().max(80).optional(),
  accessories: z.string().max(300).optional(),
  imei: z.string().optional(),
  issueDescription: z.string().min(1),
  devicePasscode: z.string().optional(),
  devicePasscodeType: z.enum(["PIN", "PASSWORD", "PATTERN"]).optional(),
});

// GET /api/kiosk/:shopId — public shop name lookup, so the kiosk page can
// greet the customer by shop name without exposing anything else.
// With ?intake=<id>, also returns that intake's status (scoped to this shop)
// so the customer's phone can live-track approval after submitting.
export async function GET(req: NextRequest, { params }: { params: { shopId: string } }) {
  const shop = await db.shop.findUnique({ where: { id: params.shopId }, select: { name: true, active: true, serviceCategories: true } });
  if (!shop || !shop.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const intakeId = req.nextUrl.searchParams.get("intake");
  if (intakeId) {
    const intake = await db.pendingIntake.findFirst({
      where: { id: intakeId, shopId: params.shopId },
      select: { status: true },
    });
    return NextResponse.json({ shopName: shop.name, intakeStatus: intake?.status ?? null });
  }

  // Brand/model catalog (static list + this shop's custom additions) so the
  // customer picks from the same lists the shop uses — with free typing as
  // fallback in the UI.
  const catalog: Record<string, string[]> = JSON.parse(JSON.stringify(DEVICE_BRANDS));
  try {
    const custom = await db.customDeviceModel.findMany({ where: { shopId: params.shopId } });
    for (const c of custom) {
      if (!catalog[c.brand]) catalog[c.brand] = [];
      if (!catalog[c.brand].includes(c.model)) catalog[c.brand].push(c.model);
    }
  } catch {}

  return NextResponse.json({ shopName: shop.name, catalog, serviceCategories: parseServiceCategories(shop.serviceCategories) });
}

// POST /api/kiosk/:shopId — public, no auth. Creates a PendingIntake that
// a staff member must review and approve before it becomes a real ticket.
export async function POST(req: NextRequest, { params }: { params: { shopId: string } }) {
  try {
    // Public, unauthenticated endpoint — throttle per IP and per shop so a
    // QR link can't be spammed to flood a shop's pending list.
    const ipLimit = await rateLimit(`kiosk:ip:${clientIp(req)}`, 12, 10 * 60 * 1000);
    if (!ipLimit.ok) { const t = tooMany(ipLimit.retryAfterSec); return NextResponse.json({ message: t.message }, { status: t.status }); }
    const shopLimit = await rateLimit(`kiosk:shop:${params.shopId}`, 40, 10 * 60 * 1000);
    if (!shopLimit.ok) { const t = tooMany(shopLimit.retryAfterSec); return NextResponse.json({ message: t.message }, { status: t.status }); }

    const shop = await db.shop.findUnique({ where: { id: params.shopId } });
    if (!shop || !shop.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = Schema.parse(await req.json());
    if (!parseServiceCategories(shop.serviceCategories).includes(body.deviceCategory)) {
      return NextResponse.json({ message: "این نوع دستگاه در این تعمیرگاه پذیرش نمی‌شود" }, { status: 400 });
    }
    // Encrypt the customer-supplied passcode at rest (same as staff intake).
    const { devicePasscode, ...rest } = body;
    const intake = await db.pendingIntake.create({
      data: {
        shopId: shop.id,
        ...rest,
        ...(devicePasscode ? { devicePasscode: encryptSecretOrPassthrough(devicePasscode) } : {}),
      },
    });

    // Ring the bell for every active staff member of this shop — QR intakes
    // used to arrive silently and sit unseen in the pending list.
    try {
      const users = await db.user.findMany({ where: { shopId: shop.id, active: true }, select: { id: true } });
      if (users.length) {
        await db.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            title: "🔳 پذیرش QR جدید",
            message: `${body.customerName} — ${body.deviceModel}`,
            link: "/pending-intakes",
          })),
        });
      }
    } catch (e) {
      console.error("[kiosk] notification failed", e);
    }

    return NextResponse.json({ intake }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
