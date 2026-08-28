import { NextResponse } from "next/server";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { probeAiConnection } from "@/lib/ai/probe";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

// POST /api/superadmin/ai-test — Super Admin only. Runs a minimal server-side
// AI request against the currently-saved configuration and reports the outcome.
// Never returns the API key or any provider internals — only a safe message.
export async function POST() {
  try {
    await requireSuperAdmin();
    const r = await probeAiConnection();
    return NextResponse.json({
      ok: r.ok,
      provider: r.provider,
      model: r.model,
      latencyMs: r.latencyMs,
      message: r.ok ? "اتصال موفق بود." : r.error?.message ?? "اتصال ناموفق بود.",
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
