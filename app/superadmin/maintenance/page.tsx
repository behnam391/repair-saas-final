"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatJalaliDate } from "@/lib/jalali";

const PLAN_LABEL: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", business: "تجاری" };

type Candidate = {
  id: string; name: string; plan: string; createdAt: string; isTest: boolean;
  ticketCount: number; userCount: number; invoiceCount: number;
};

export default function MaintenancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalShops, setTotalShops] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/superadmin/cleanup");
    if (res.ok) {
      const d = await res.json();
      setCandidates(d.candidates ?? []);
      setTotalShops(d.totalShops ?? 0);
    }
    setSelected(new Set());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function selectAllEmpty() {
    setSelected(new Set(candidates.filter((c) => c.ticketCount === 0).map((c) => c.id)));
  }

  async function toggleTest(c: Candidate) {
    await fetch("/api/superadmin/cleanup", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: c.id, isTest: !c.isTest }),
    });
    load();
  }

  async function deleteSelected() {
    setDeleting(true);
    await fetch("/api/superadmin/cleanup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopIds: [...selected] }),
    });
    setDeleting(false);
    setConfirm(false);
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-4">نگهداری و پاکسازی</h1>

      {/* ── Backup ── */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-5">
        <div className="text-sm font-bold mb-1">💾 پشتیبان‌گیری کامل</div>
        <p className="text-[11px] text-muted mb-3">
          یک فایل JSON از کل داده‌های سایت می‌گیرد و روی سیستم خودت دانلود می‌کند (چیزی روی سرور ذخیره نمی‌شود). این نسخه‌ی دستی است؛ بکاپ خودکار را از داشبورد سرویس دیتابیس‌ات (PITR) فعال نگه دار.
        </p>
        <a href="/api/superadmin/backup"
          className="inline-block bg-copper text-[#1A1410] font-bold rounded-lg px-4 py-2.5 text-sm">
          ⬇️ دانلود بکاپ کامل
        </a>
      </div>

      {/* ── Test-data cleanup ── */}
      <div className="bg-surface border border-surface2 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold">🧹 پاکسازی داده‌های آزمایشی</div>
          <div className="text-[10px] text-muted">کل مغازه‌ها: {totalShops.toLocaleString("fa-IR")}</div>
        </div>
        <p className="text-[11px] text-muted mb-3">
          مغازه‌های «خالی» (بدون هیچ تیکت) یا آن‌هایی که «علامت تست» خورده‌اند این‌جا فهرست می‌شوند — معمولاً همان ثبت‌نام‌های آزمایشی‌اند. انتخاب کن و باهم حذف کن. حذف کامل و بازگشت‌ناپذیر است.
        </p>

        <div className="flex gap-2 mb-3 flex-wrap">
          <button onClick={selectAllEmpty} className="text-[11px] font-semibold rounded-lg px-3 py-1.5 bg-surface2 text-muted hover:text-ink">
            انتخاب همه‌ی خالی‌ها
          </button>
          {selected.size > 0 && (
            confirm ? (
              <div className="flex gap-1.5 items-center">
                <span className="text-[11px] text-danger">{selected.size.toLocaleString("fa-IR")} مغازه حذف شود؟</span>
                <button onClick={deleteSelected} disabled={deleting} className="text-[11px] font-bold rounded-lg px-2.5 py-1 bg-danger text-white disabled:opacity-50">
                  {deleting ? "..." : "بله، حذف کن"}
                </button>
                <button onClick={() => setConfirm(false)} className="text-[11px] rounded-lg px-2.5 py-1 bg-surface2 text-muted">لغو</button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)} className="text-[11px] font-bold rounded-lg px-3 py-1.5 bg-danger/15 text-danger hover:bg-danger/25">
                🗑 حذف {selected.size.toLocaleString("fa-IR")} انتخاب‌شده
              </button>
            )
          )}
        </div>

        {loading ? (
          <p className="text-muted text-sm">در حال بارگذاری...</p>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-1">✨</div>
            <p className="text-muted text-sm">هیچ مغازه‌ی خالی یا آزمایشی‌ای نیست.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((c) => {
              const isSel = selected.has(c.id);
              return (
                <div key={c.id} className={`border rounded-xl p-3 flex items-center gap-3 ${isSel ? "border-danger/50 bg-danger/5" : "border-surface2 bg-surface2"}`}>
                  <input type="checkbox" checked={isSel} onChange={() => toggle(c.id)} className="w-4 h-4 shrink-0 accent-danger" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm">{c.name}</span>
                      <span className="text-[9px] rounded px-1.5 py-0.5 bg-surface text-muted">{PLAN_LABEL[c.plan] ?? c.plan}</span>
                      {c.ticketCount === 0 && <span className="text-[9px] rounded px-1.5 py-0.5 bg-amber/20 text-amber">خالی</span>}
                      {c.isTest && <span className="text-[9px] rounded px-1.5 py-0.5 bg-copper/20 text-copper">تست</span>}
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {formatJalaliDate(c.createdAt)} · {c.ticketCount.toLocaleString("fa-IR")} تیکت · {c.userCount.toLocaleString("fa-IR")} کاربر · {c.invoiceCount.toLocaleString("fa-IR")} فاکتور
                    </div>
                  </div>
                  <button onClick={() => toggleTest(c)}
                    className={`text-[10px] font-semibold rounded-lg px-2.5 py-1 shrink-0 ${c.isTest ? "bg-copper/20 text-copper" : "bg-surface text-muted"}`}>
                    {c.isTest ? "برداشتن علامت" : "علامت تست"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
