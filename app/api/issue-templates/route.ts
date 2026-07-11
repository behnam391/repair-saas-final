import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { DEFAULT_ISSUE_TEMPLATES } from "@/lib/issue-templates";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { shopId } = await requireSession();
    let templates = await db.issueTemplate.findMany({ where: { shopId } });

    if (templates.length === 0) {
      // Lazy-seed sensible defaults the first time this shop asks.
      const seedData = Object.entries(DEFAULT_ISSUE_TEMPLATES).flatMap(([lane, labels]) =>
        labels.map((label) => ({ shopId, lane: lane as any, label }))
      );
      await db.issueTemplate.createMany({ data: seedData });
      templates = await db.issueTemplate.findMany({ where: { shopId } });
    }

    return NextResponse.json({ templates });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const CreateSchema = z.object({ lane: z.enum(["HARDWARE", "SOFTWARE", "BOARD"]), label: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const body = CreateSchema.parse(await req.json());
    const template = await db.issueTemplate.create({ data: { shopId, ...body } });
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

const DeleteSchema = z.object({ id: z.string() });

export async function DELETE(req: NextRequest) {
  try {
    const { shopId } = await requireSession();
    const { id } = DeleteSchema.parse(await req.json());
    await db.issueTemplate.deleteMany({ where: { id, shopId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
