import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireDeskSession, UnauthorizedError } from "@/lib/tenant";
import { decryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireDeskSession();
    const intakes = await db.pendingIntake.findMany({ where: { shopId, status: "PENDING" }, orderBy: { createdAt: "desc" } });

    const phones = intakes.map((i) => i.customerPhone);
    const existingCustomers = await db.customer.findMany({ where: { shopId, phone: { in: phones } }, select: { phone: true } });
    const existingPhones = new Set(existingCustomers.map((c) => c.phone));

    // Passcode is stored encrypted at rest; decrypt it for the desk-only review
    // card so approving staff see it as before (this endpoint is requireDesk).
    const withFlag = intakes.map((i) => ({
      ...i,
      devicePasscode: i.devicePasscode ? decryptSecret(i.devicePasscode) : i.devicePasscode,
      isNewCustomer: !existingPhones.has(i.customerPhone),
    }));
    return NextResponse.json({ intakes: withFlag });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
