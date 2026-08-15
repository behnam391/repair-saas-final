import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { decryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

// GET /api/tickets/:id/passcode — reveal a customer device passcode on demand.
// The passcode is stored ENCRYPTED (see lib/crypto.ts) and is deliberately NOT
// included in the bulk ticket list (see GET /api/tickets), so it is only ever
// decrypted here, for a signed-in staff member of the SAME shop, and every
// reveal is written to PasscodeAccessLog for audit. This is the only place a
// passcode leaves the server in plaintext.
//
// Note: this is NOT part of the ticket state machine (PATCH /api/tickets/:id) —
// it neither reads nor changes ticket status/lane.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId } = await requireSession();

    const ticket = await db.ticket.findFirst({
      where: { id: params.id, shopId }, // never trust the id without the tenant scope
      select: { id: true, devicePasscode: true, devicePasscodeType: true },
    });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (!ticket.devicePasscode) {
      return NextResponse.json({ passcode: null, type: ticket.devicePasscodeType ?? null });
    }

    const passcode = decryptSecret(ticket.devicePasscode);

    // Audit the reveal — best-effort; a logging failure must not block access.
    try {
      await (db as any).passcodeAccessLog.create({
        data: { shopId, ticketId: ticket.id, userId },
      });
    } catch (e) {
      console.error("[passcode] audit log write failed", e);
    }

    return NextResponse.json({ passcode, type: ticket.devicePasscodeType ?? null });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
