import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/conversations — every thread where the current user is either
// the one who started the chat, or the author of the listing being
// discussed. Nationwide by design (same as /api/market), scoped only to
// "am I a participant", not to shopId.
export async function GET() {
  try {
    const { userId } = await requireSession();

    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ starterId: userId }, { listing: { authorId: userId } }],
      },
      include: {
        listing: { select: { id: true, title: true, authorId: true, author: { select: { name: true } } } },
        starter: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ conversations });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
