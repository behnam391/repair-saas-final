import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/market/:id/conversations — find-or-create the chat thread
// between the current user and the listing's author (Divar-style "چت"
// button). If the current user IS the author, this is a no-op error —
// authors reply from their inbox once a buyer starts the thread.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();

    const listing = await db.marketListing.findUnique({ where: { id: params.id } });
    if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (listing.authorId === userId) {
      return NextResponse.json({ error: "cannot_chat_self", message: "این آگهی متعلق به شماست." }, { status: 400 });
    }

    const conversation = await db.conversation.upsert({
      where: { listingId_starterId: { listingId: listing.id, starterId: userId } },
      update: {},
      create: { listingId: listing.id, starterId: userId },
    });

    return NextResponse.json({ conversation });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
