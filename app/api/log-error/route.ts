import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/logError";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Public, no-auth intake for BROWSER-side errors (React error boundaries and
// the window error/unhandledrejection listeners in ClientErrorReporter).
// Rate-limited per IP so a broken page — or an abuser — can't flood the table.
// `source` is forced to a client-side value here; server code writes ErrorLog
// directly via lib/logError.ts and never comes through this endpoint.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit(`log-error:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore malformed body — we still record a bare entry below
  }

  const source = body?.source === "boundary" ? "boundary" : "client";
  const level = body?.level === "fatal" || body?.level === "warn" ? body.level : "error";

  await logError({
    source,
    level,
    message: typeof body?.message === "string" && body.message ? body.message : "(client error, no message)",
    stack: typeof body?.stack === "string" ? body.stack : null,
    digest: typeof body?.digest === "string" ? body.digest : null,
    path: typeof body?.path === "string" ? body.path : null,
    userAgent: req.headers.get("user-agent"),
    context: body?.context && typeof body.context === "object" ? body.context : null,
  });

  return NextResponse.json({ ok: true });
}
