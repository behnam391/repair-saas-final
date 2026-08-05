import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { preprocessPhone } from "@/lib/phone";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/customers?page=1&pageSize=10&q=... — this shop's address book,
// paginated + server-side searched (by name or phone), newest first.
export async function GET(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));
    const q = (searchParams.get("q") || "").trim();

    const where: any = { shopId };
    if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }];

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: { _count: { select: { tickets: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.customer.count({ where }),
    ]);

    return NextResponse.json({ customers, total, page, pageSize });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const CreateSchema = z.object({
  name: z.string().min(1),
  // The shop's customer book is matched to the nationwide customer account
  // by phone ALONE, and it is what SMS is sent to — a Persian-digit number
  // here silently breaks both. See lib/phone.ts.
  phone: z.preprocess(preprocessPhone, z.string().min(5)),
  email: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireDeskSession();
    const body = CreateSchema.parse(await req.json());

    const existing = await db.customer.findFirst({ where: { shopId, phone: body.phone } });
    if (existing) return NextResponse.json({ error: "already_exists", message: "مشتری با این شماره قبلاً ثبت شده" }, { status: 409 });

    const customer = await db.customer.create({ data: { shopId, ...body } as any });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
