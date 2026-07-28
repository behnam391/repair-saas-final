"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatJalaliDateTime } from "@/lib/jalali";

type ErrorRow = {
  id: string;
  source: string;
  level: string;
  message: string;
  stack: string | null;
  digest: string | null;
  path: string | null;
  method: string | null;
  shopId: string | null;
  userId: string | null;
  userAgent: string | null;
  context: string | null;
  resolved: boolean;
  createdAt: string;
};

const FILTERS: [string, string][] = [
  ["unresolved", "حل‌نشده"],
  ["all", "همه"],
  ["server", "سرور"],
  ["client", "مرورگر"],
  ["payment", "پرداخت"],
  ["boundary", "کرش صفحه"],
];

const SOURCE_LABEL: Record<string, string> = {
  server: "سرور",
  client: "مرورگر",
  payment: "پرداخت",
  boundary: "کرش صفحه",
};

const LEVEL_STYLE: Record<string, string> = {
  fatal: "bg-danger/25 text-danger",
  error: "bg-danger/15 text-danger",
  warn: "bg-amber/20 text-amber",
};

export default function SuperAdminErrorsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [counts, setCounts] = useState({ total: 0, unresolved: 0 });
  const [filter, setFilter] = useState("unresolved");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<"resolved" | "all" | null>(null);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/superadmin/errors?filter=${filter}`);
    if (res.ok) {
      const d = await res.json();
      setErrors(d.errors ?? []);
      setCounts(d.counts ?? { total: 0, unresolved: 0 });
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleResolved(row: ErrorRow) {
    await fetch("/api/superadmin/errors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, resolved: !row.resolved }),
    });
    load();
  }

  async function resolveAll() {
    await fetch("/api/superadmin/errors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolveAll: true }),
    });
    load();
  }

  async function clearLogs(scope: "resolved" | "all") {
    await fetch(`/api/superadmin/errors?scope=${scope}`, { method: "DELETE" });
    setConfirmClear(null);
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">خطاها</h1>
      <p className="text-[11px] text-muted mb-4">
        هر خطایی که در برنامه رخ دهد (سرور، مرورگر، پرداخت یا کرش صفحه) اینجا ثبت می‌شود تا وقتی چیزی خراب شد بتوانی سریع پیدایش کنی.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-3">
          <div className="text-[11px] text-muted mb-1">کل خطاها</div>
          <div className="text-lg font-extrabold mono">{counts.total.toLocaleString("fa-IR")}</div>
        </div>
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-3">
          <div className="text-[11px] text-muted mb-1">حل‌نشده</div>
          <div className={`text-lg font-extrabold mono ${counts.unresolved > 0 ? "text-danger" : "text-teal"}`}>
            {counts.unresolved.toLocaleString("fa-IR")}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
        {FILTERS.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`text-[11px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap transition ${
              filter === val ? "bg-copper text-[#0A0F1E]" : "bg-surface2 text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={resolveAll}
          disabled={counts.unresolved === 0}
          className="text-[11px] font-semibold rounded-lg px-3 py-1.5 bg-teal/20 text-teal hover:bg-teal/30 transition disabled:opacity-40"
        >
          ✓ علامت‌گذاری همه به‌عنوان حل‌شده
        </button>
        {confirmClear ? (
          <div className="flex gap-1.5 items-center">
            <span className="text-[11px] text-danger">
              {confirmClear === "all" ? "همه‌ی خطاها پاک شود؟" : "خطاهای حل‌شده پاک شود؟"}
            </span>
            <button onClick={() => clearLogs(confirmClear)} className="text-[11px] font-bold rounded-lg px-2.5 py-1 bg-danger text-white">
              بله، پاک کن
            </button>
            <button onClick={() => setConfirmClear(null)} className="text-[11px] rounded-lg px-2.5 py-1 bg-surface2 text-muted">
              لغو
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmClear("resolved")}
              className="text-[11px] font-semibold rounded-lg px-3 py-1.5 bg-surface2 text-muted hover:text-ink transition"
            >
              🧹 پاک‌کردن حل‌شده‌ها
            </button>
            <button
              onClick={() => setConfirmClear("all")}
              className="text-[11px] font-semibold rounded-lg px-3 py-1.5 bg-danger/15 text-danger hover:bg-danger/25 transition"
            >
              🗑 پاک‌کردن همه
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-muted text-sm">در حال بارگذاری...</p>
      ) : errors.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-muted text-sm">هیچ خطایی در این دسته ثبت نشده.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map((e) => (
            <div
              key={e.id}
              className={`bg-surface2 border rounded-xl p-3 ${e.resolved ? "border-surface2 opacity-60" : "border-danger/40"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${LEVEL_STYLE[e.level] ?? "bg-surface text-muted"}`}>
                      {e.level.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-semibold rounded px-1.5 py-0.5 bg-surface text-muted">
                      {SOURCE_LABEL[e.source] ?? e.source}
                    </span>
                    {e.resolved && <span className="text-[9px] font-semibold rounded px-1.5 py-0.5 bg-teal/20 text-teal">حل‌شده</span>}
                  </div>
                  <div className="text-sm font-semibold break-words">{e.message}</div>
                  <div className="text-[10px] text-muted mt-1 flex gap-2 flex-wrap">
                    {e.path && <span className="mono" dir="ltr">{e.method ? e.method + " " : ""}{e.path}</span>}
                    <span>{formatJalaliDateTime(e.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleResolved(e)}
                  className={`text-[10px] font-semibold rounded-lg px-2.5 py-1 shrink-0 transition ${
                    e.resolved ? "bg-surface text-muted" : "bg-teal/20 text-teal hover:bg-teal/30"
                  }`}
                >
                  {e.resolved ? "بازکردن" : "حل شد"}
                </button>
              </div>

              {(e.stack || e.context || e.digest || e.shopId || e.userAgent) && (
                <button
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  className="text-[10px] text-copper mt-2"
                >
                  {expanded === e.id ? "بستن جزئیات ▲" : "جزئیات فنی ▼"}
                </button>
              )}

              {expanded === e.id && (
                <div className="mt-2 space-y-2">
                  {e.digest && (
                    <div className="text-[10px] text-muted mono" dir="ltr">
                      digest: {e.digest}
                    </div>
                  )}
                  {(e.shopId || e.userId) && (
                    <div className="text-[10px] text-muted mono" dir="ltr">
                      {e.shopId ? `shop: ${e.shopId}` : ""} {e.userId ? `user: ${e.userId}` : ""}
                    </div>
                  )}
                  {e.stack && (
                    <pre
                      dir="ltr"
                      className="text-[10px] leading-relaxed bg-[#0b1120] border border-white/10 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap mono text-[#cbd5e8]"
                    >
                      {e.stack}
                    </pre>
                  )}
                  {e.context && (
                    <pre dir="ltr" className="text-[10px] bg-[#0b1120] border border-white/10 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap mono text-[#cbd5e8]">
                      {e.context}
                    </pre>
                  )}
                  {e.userAgent && (
                    <div className="text-[9px] text-muted mono break-all" dir="ltr">
                      {e.userAgent}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
