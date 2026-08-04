import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ shopId: z.string(), stars: z.number().int().min(1).max(5), comment: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await requireCustomerSession();
    const { shopId, stars, comment } = Schema.parse(await req.json());

    const rating = await db.rating.upsert({
      where: { shopId_platformCustomerId: { shopId, platformCustomerId: customerId } },
      update: { stars, comment },
      create: { shopId, platformCustomerId: customerId, stars, comment },
    });

    return NextResponse.json({ rating }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
