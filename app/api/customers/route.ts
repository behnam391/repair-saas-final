import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const customers = await db.customer.findMany({
      where: { shopId },
      include: { _count: { select: { tickets: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ customers });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const CreateSchema = z.object({ name: z.string().min(1), phone: z.string().min(5) });

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const body = CreateSchema.parse(await req.json());

    const existing = await db.customer.findFirst({ where: { shopId, phone: body.phone } });
    if (existing) return NextResponse.json({ error: "already_exists", message: "مشتری با این شماره قبلاً ثبت شده" }, { status: 409 });

    const customer = await db.customer.create({ data: { shopId, ...body } });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
