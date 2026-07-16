import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireSession();
    const intakes = await db.pendingIntake.findMany({ where: { shopId, status: "PENDING" }, orderBy: { createdAt: "desc" } });

    const phones = intakes.map((i) => i.customerPhone);
    const existingCustomers = await db.customer.findMany({ where: { shopId, phone: { in: phones } }, select: { phone: true } });
    const existingPhones = new Set(existingCustomers.map((c) => c.phone));

    const withFlag = intakes.map((i) => ({ ...i, isNewCustomer: !existingPhones.has(i.customerPhone) }));
    return NextResponse.json({ intakes: withFlag });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
