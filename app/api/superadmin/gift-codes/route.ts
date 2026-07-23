import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET — all gift codes, newest first, with the redeeming shop's name.
export async function GET() {
  try {
    await requireSuperAdmin();
    const codes = await db.giftCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    const shopIds = codes.map((c: any) => c.redeemedByShopId).filter(Boolean) as string[];
    const shops = shopIds.length
      ? await db.shop.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(shops.map((s) => [s.id, s.name]));
    return NextResponse.json({
      codes: codes.map((c: any) => ({ ...c, redeemedByShopName: c.redeemedByShopId ? nameById.get(c.redeemedByShopId) ?? "—" : null })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const CreateSchema = z.object({
  plan: z.enum(["pro", "business"]),
  months: z.number().int().min(1).max(36),
  count: z.number().int().min(1).max(50).default(1),
  note: z.string().max(120).optional(),
});

// Human-friendly, unambiguous code (no 0/O/1/I).
function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `PEYVO-${s}`;
}

// POST — generate one or more gift codes.
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { plan, months, count, note } = CreateSchema.parse(await req.json());
    const created = [];
    for (let i = 0; i < count; i++) {
      // Retry a couple of times on the (astronomically unlikely) collision.
      let code = genCode();
      for (let attempt = 0; attempt < 3; attempt++) {
        const exists = await db.giftCode.findUnique({ where: { code } });
        if (!exists) break;
        code = genCode();
      }
      created.push(await db.giftCode.create({ data: { code, plan, months, note } }));
    }
    return NextResponse.json({ codes: created }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
