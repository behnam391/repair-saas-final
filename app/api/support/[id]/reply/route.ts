import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ message: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { message } = Schema.parse(await req.json());
    const ticket = await db.supportTicket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const isPlatform = !!user.isSuperAdmin;
    if (!isPlatform && ticket.shopId !== user.shopId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const reply = await db.supportReply.create({
      data: { supportTicketId: ticket.id, fromPlatform: isPlatform, message },
    });
    return NextResponse.json({ reply }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
