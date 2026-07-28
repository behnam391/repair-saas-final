import { db } from "@/lib/db";

// ── Safe error-logging helper ─────────────────────────────────
// Writes one row into the ErrorLog table (see prisma/schema.prisma) so the
// platform owner can inspect production failures from the super-admin panel.
//
// GOLDEN RULE: this function must NEVER throw. It is called from inside
// `catch` blocks of code that is already failing — if the log write itself
// errored (DB down, table missing mid-migration, …) and that propagated, it
// would mask or worsen the original problem. Every failure here is swallowed.

export type LogErrorInput = {
  source?: string; // "server" | "client" | "payment" | "boundary"
  level?: string; // "error" | "warn" | "fatal"
  message: string;
  stack?: string | null;
  digest?: string | null;
  path?: string | null;
  method?: string | null;
  shopId?: string | null;
  userId?: string | null;
  userAgent?: string | null;
  context?: Record<string, unknown> | string | null;
};

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function toContextString(ctx: LogErrorInput["context"]): string | null {
  if (ctx == null) return null;
  if (typeof ctx === "string") return truncate(ctx, 4000);
  try {
    return truncate(JSON.stringify(ctx), 4000);
  } catch {
    return null;
  }
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    await (db as any).errorLog.create({
      data: {
        source: input.source || "server",
        level: input.level || "error",
        message: truncate(input.message || "(no message)", 2000),
        stack: input.stack ? truncate(input.stack, 8000) : null,
        digest: input.digest || null,
        path: input.path ? truncate(input.path, 500) : null,
        method: input.method || null,
        shopId: input.shopId || null,
        userId: input.userId || null,
        userAgent: input.userAgent ? truncate(input.userAgent, 500) : null,
        context: toContextString(input.context),
      },
    });
  } catch {
    // Intentionally swallowed — logging must never take down the caller.
  }
}

// Convenience wrapper for API-route catch blocks: pulls message/stack off an
// unknown thrown value without the caller having to narrow the type itself.
export async function logCaught(
  err: unknown,
  meta: Omit<LogErrorInput, "message" | "stack"> = {}
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? null : null;
  await logError({ ...meta, message, stack });
}
