import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function assertParticipant(conversationId: string, userId: string) {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { listing: { select: { authorId: true } } },
  });
  if (!convo) return null;
  const isParticipant = convo.starterId === userId || convo.listing.authorId === userId;
  return isParticipant ? convo : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Super admins can view any conversation for moderation; everyone
    // else must be an actual participant.
    if (!sessionUser.isSuperAdmin) {
      const convo = await assertParticipant(params.id, sessionUser.id);
      if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: { conversationId: params.id },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const MessageSchema = z.object({ content: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const convo = await assertParticipant(params.id, userId);
    if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { content } = MessageSchema.parse(await req.json());
    const message = await db.message.create({
      data: { conversationId: params.id, senderId: userId, content },
      include: { sender: { select: { name: true } } },
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
