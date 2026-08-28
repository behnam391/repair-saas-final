import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin("marketing");
    const ads = await db.adBanner.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ ads });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const Schema = z.object({
  imageUrl: z.string().min(1), linkUrl: z.string().optional(),
  displayType: z.enum(["BANNER", "POPUP", "LANDING"]).default("BANNER"),
  title: z.string().max(100).optional(), description: z.string().max(300).optional(), ctaLabel: z.string().max(40).optional(),
  startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional(), sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin("marketing");
    const body = Schema.parse(await req.json());
    const ad = await db.adBanner.create({ data: body });
    return NextResponse.json({ ad }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
