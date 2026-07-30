"use client";
import { useEffect, useState, useCallback, type ChangeEvent } from "react";
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
  const [tg, setTg] = useState({ token: "", chatId: "" });
  const [tgMsg, setTgMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tgBusy, setTgBusy] = useState<"save" | "test" | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<any>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/superadmin/settings").then((r) => r.json()).then((d) => {
      setTg({ token: d.settings?.telegramBotToken ?? "", chatId: d.settings?.telegramChatId ?? "" });
    }).catch(() => {});
  }, []);

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

  async function saveTelegram(then?: "test") {
    setTgBusy(then ?? "save"); setTgMsg(null);
    const res = await fetch("/api/superadmin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramBotToken: tg.token, telegramChatId: tg.chatId }),
    });
    if (!res.ok) { setTgBusy(null); setTgMsg({ ok: false, text: "ذخیره ناموفق بود." }); return false; }
    if (!then) { setTgBusy(null); setTgMsg({ ok: true, text: "✅ ذخیره شد." }); }
    return true;
  }
  async function testTelegram() {
    // save the latest token/chat id first, then send a real backup now
    const ok = await saveTelegram("test");
    if (!ok) return;
    const res = await fetch("/api/superadmin/backup", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setTgBusy(null);
    setTgMsg(res.ok
      ? { ok: true, text: "✅ بکاپ آزمایشی به تلگرام ارسال شد. چتت را ببین." }
      : { ok: false, text: d.message || "ارسال ناموفق بود." });
  }

  function onRestoreFile(e: ChangeEvent<HTMLInputElement>) {
    setRestoreMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed?.models) { setRestoreMsg({ ok: false, text: "فایل بکاپ معتبر نیست." }); return; }
        setRestoreConfirm(parsed);
      } catch {
        setRestoreMsg({ ok: false, text: "فایل JSON خوانده نشد." });
      }
    };
    reader.readAsText(file);
  }
  async function doRestore() {
    if (!restoreConfirm) return;
    setRestoring(true); setRestoreMsg(null);
    const res = await fetch("/api/superadmin/restore", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ models: restoreConfirm.models }),
    });
    const d = await res.json().catch(() => ({}));
    setRestoring(false); setRestoreConfirm(null);
    if (res.ok) {
      setRestoreMsg({ ok: true, text: `✅ بازیابی انجام شد: ${(d.totalRestored ?? 0).toLocaleString("fa-IR")} رکورد بازگردانده شد${d.totalFailed ? `، ${(d.totalFailed).toLocaleString("fa-IR")} ناموفق` : ""}.` });
      load();
    } else {
      setRestoreMsg({ ok: false, text: d.message || "بازیابی ناموفق بود." });
    }
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

      {/* ── Auto-backup to Telegram ── */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-5">
        <div className="text-sm font-bold mb-1">🤖 بکاپ خودکار روزانه (تلگرام)</div>
        <p className="text-[11px] text-muted mb-3">
          هر روز یک بکاپ کامل خودکار ساخته و به رباتِ تلگرام فرستاده می‌شود. توکن ربات را از <span dir="ltr">@BotFather</span> بگیر، و شناسه‌ی چت را از <span dir="ltr">@userinfobot</span>. حتماً اول یک‌بار به رباتِ خودت در تلگرام «Start» بزن تا بتواند پیام بفرستد.
        </p>
        <label className="block text-[11px] text-muted mb-1">توکن ربات</label>
        <input dir="ltr" placeholder="123456:ABC-..." className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono mb-2"
          value={tg.token} onChange={(e) => setTg({ ...tg, token: e.target.value })} />
        <label className="block text-[11px] text-muted mb-1">شناسه‌ی چت (Chat ID)</label>
        <input dir="ltr" placeholder="123456789" className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mono mb-3"
          value={tg.chatId} onChange={(e) => setTg({ ...tg, chatId: e.target.value })} />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => saveTelegram()} disabled={tgBusy !== null}
            className="bg-copper text-[#1A1410] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-50">
            {tgBusy === "save" ? "..." : "ذخیره"}
          </button>
          <button onClick={testTelegram} disabled={tgBusy !== null || !tg.token || !tg.chatId}
            className="bg-teal/20 text-teal font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
            {tgBusy === "test" ? "در حال ارسال..." : "ارسال بکاپ آزمایشی"}
          </button>
        </div>
        {tgMsg && <p className={`text-xs mt-2 ${tgMsg.ok ? "text-teal" : "text-danger"}`}>{tgMsg.text}</p>}
      </div>

      {/* ── Restore ── */}
      <div className="bg-surface border border-danger/30 rounded-xl p-4 mb-5">
        <div className="text-sm font-bold mb-1">♻️ بازیابی از فایل بکاپ</div>
        <p className="text-[11px] text-muted mb-3">
          یک فایل بکاپ (JSON) انتخاب کن تا داده‌هایش برگردانده شوند. رکوردهای هم‌شناسه بازنویسی و رکوردهای حذف‌شده دوباره ساخته می‌شوند — ولی داده‌های جدیدترِ فعلی پاک نمی‌شوند. برای بازگشتِ کاملِ دیتابیس به یک لحظه‌ی گذشته، از PITRِ سرویس دیتابیس استفاده کن.
        </p>
        <input type="file" accept="application/json,.json" onChange={onRestoreFile}
          className="block w-full text-xs text-muted file:ml-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-ink file:text-xs mb-2" />
        {restoreConfirm && (
          <div className="bg-danger/10 border border-danger/40 rounded-lg p-3 mt-2">
            <p className="text-[11px] text-danger mb-2">
              فایل بکاپِ <span className="mono">{String(restoreConfirm.exportedAt ?? "").slice(0, 10)}</span> آماده است. مطمئنی بازیابی شود؟ (رکوردهای هم‌شناسه بازنویسی می‌شوند.)
            </p>
            <div className="flex gap-2">
              <button onClick={doRestore} disabled={restoring} className="bg-danger text-white font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-50">
                {restoring ? "در حال بازیابی..." : "بله، بازیابی کن"}
              </button>
              <button onClick={() => setRestoreConfirm(null)} className="bg-surface2 text-muted rounded-lg px-4 py-2 text-sm">لغو</button>
            </div>
          </div>
        )}
        {restoreMsg && <p className={`text-xs mt-2 ${restoreMsg.ok ? "text-teal" : "text-danger"}`}>{restoreMsg.text}</p>}
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
