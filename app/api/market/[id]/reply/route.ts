import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ReplySchema = z.object({ message: z.string().min(1) });

// POST /api/market/:id/reply — any signed-in technician can reply
// (e.g. "من این برد رو دارم", "این فایل فلش رو برات می‌فرستم").
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { shopId, userId } = await requireSession();
    const body = ReplySchema.parse(await req.json());

    const listing = await db.marketListing.findUnique({ where: { id: params.id } });
    if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const reply = await db.marketReply.create({
      data: { listingId: listing.id, shopId, authorId: userId, message: body.message },
      include: { author: { select: { name: true, phone: true } } },
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input", details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// PATCH /api/market/:id/reply — reused path to mark a listing resolved.
// Only the original author may close their own post.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const listing = await db.marketListing.findUnique({ where: { id: params.id } });
    if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (listing.authorId !== userId) {
      return NextResponse.json({ error: "forbidden", message: "فقط نویسنده پست می‌تواند آن را ببندد" }, { status: 403 });
    }
    const updated = await db.marketListing.update({ where: { id: listing.id }, data: { status: "RESOLVED" } });
    return NextResponse.json({ listing: updated });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
