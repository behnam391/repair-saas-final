import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { DEVICE_BRANDS } from "@/lib/device-catalog";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const [favorites, custom] = await Promise.all([
      db.favoriteBrand.findMany({ where: { shopId } }),
      db.customDeviceModel.findMany({ where: { shopId } }),
    ]);

    // Merge static catalog with this shop's custom additions.
    const catalog: Record<string, string[]> = JSON.parse(JSON.stringify(DEVICE_BRANDS));
    for (const c of custom) {
      if (!catalog[c.brand]) catalog[c.brand] = [];
      if (!catalog[c.brand].includes(c.model)) catalog[c.brand].push(c.model);
    }

    return NextResponse.json({ catalog, favoriteBrands: favorites.map((f) => f.brand) });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const ToggleSchema = z.object({ brand: z.string().min(1), favorite: z.boolean() });

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { brand, favorite } = ToggleSchema.parse(await req.json());

    if (favorite) {
      await db.favoriteBrand.upsert({
        where: { shopId_brand: { shopId, brand } },
        update: {},
        create: { shopId, brand },
      });
    } else {
      await db.favoriteBrand.deleteMany({ where: { shopId, brand } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
