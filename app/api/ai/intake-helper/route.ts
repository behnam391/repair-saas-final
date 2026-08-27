import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/tenant";
import { runCompletion, redactForPrompt } from "@/lib/ai";
import {
  buildIntakeHelperPrompt,
  parseIntakeHelperResult,
  INTAKE_HELPER_DISCLAIMER,
} from "@/lib/ai/tasks/intake-helper";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({ ticketId: z.string().min(1) });

function laneLabel(lane: string): string {
  return (
    ({ HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی (برد/هارد)", READY: "آماده تحویل" } as Record<string, string>)[
      lane
    ] ?? lane
  );
}

function messageFor(status: string): string {
  switch (status) {
    case "disabled":
      return "دستیار هوش مصنوعی در حال حاضر فعال نیست.";
    case "quota_exceeded":
      return "سقف استفاده روزانه هوش مصنوعی این مغازه پر شده است. بعداً دوباره تلاش کنید.";
    case "empty":
      return "پاسخ قابل‌استفاده‌ای دریافت نشد. لطفاً دوباره تلاش کنید.";
    default:
      return "دریافت پاسخ از سرویس هوش مصنوعی ناموفق بود. بعداً دوباره تلاش کنید.";
  }
}

// Best-effort audit write. Stores a REDACTED input summary (never raw PII) and,
// on success, the parsed sections. Never throws into the request.
async function persist(args: {
  shopId: string;
  ticketId: string;
  userId: string;
  input: string;
  parsed: unknown | null;
  provider: string;
  model?: string;
  status: string;
}) {
  try {
    return await (db as any).aiSuggestion.create({
      data: {
        shopId: args.shopId,
        ticketId: args.ticketId,
        createdByUserId: args.userId,
        kind: "intake_helper",
        inputSummary: redactForPrompt(args.input).slice(0, 2000),
        output: args.parsed ? JSON.stringify(args.parsed) : null,
        provider: args.provider,
        model: args.model ?? null,
        status: args.status,
      },
    });
  } catch (e) {
    console.error("[ai] AiSuggestion persist failed", e);
    return null;
  }
}

// POST /api/ai/intake-helper { ticketId }
// Advisory intake helper. Reads ONLY minimal intake fields for this shop's
// ticket, runs them through the provider-agnostic lib/ai service, and returns
// three labeled suggestion sections. AI failures never surface as 500 — the
// ticket page keeps working regardless.
export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await requireSession();
    const { ticketId } = Schema.parse(await req.json());

    // Tenant-scoped lookup — a caller can never reach another shop's ticket,
    // and only the minimal intake fields are selected (no customer PII).
    const ticket = await db.ticket.findFirst({
      where: { id: ticketId, shopId },
      select: { id: true, deviceModel: true, issueInitial: true, customerDamageNotes: true, lane: true },
    });
    if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { system, input } = buildIntakeHelperPrompt({
      deviceModel: ticket.deviceModel,
      laneLabel: laneLabel(ticket.lane),
      issueInitial: ticket.issueInitial,
      customerDamageNotes: ticket.customerDamageNotes,
    });

    const ai = await runCompletion({
      shopId,
      task: "intake.helper",
      system,
      input,
      responseFormat: "json",
      // Leave enough room for reasoning-capable models plus the short JSON.
      maxTokens: 2048,
    });

    // AI-level failure (disabled / quota / provider error) → clean soft status.
    if (!ai.ok) {
      const status =
        ai.error?.kind === "disabled" ? "disabled" : ai.error?.kind === "quota_exceeded" ? "quota_exceeded" : "error";
      await persist({ shopId, ticketId: ticket.id, userId, input, parsed: null, provider: ai.provider, model: ai.model, status });
      return NextResponse.json({ ok: false, status, message: messageFor(status) });
    }

    // Unparseable / empty model output → clean "empty" status.
    const parsed = parseIntakeHelperResult(ai.text);
    if (!parsed) {
      await persist({ shopId, ticketId: ticket.id, userId, input, parsed: null, provider: ai.provider, model: ai.model, status: "empty" });
      return NextResponse.json({ ok: false, status: "empty", message: messageFor("empty") });
    }

    const rec = await persist({
      shopId,
      ticketId: ticket.id,
      userId,
      input,
      parsed,
      provider: ai.provider,
      model: ai.model,
      status: "ok",
    });

    return NextResponse.json({
      ok: true,
      status: "ok",
      suggestion: parsed,
      provider: ai.provider,
      suggestionId: rec?.id ?? null,
      disclaimer: INTAKE_HELPER_DISCLAIMER,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
