"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Globe2,
  Laptop,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
  UserRound,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import { formatJalaliDateTime } from "@/lib/jalali";

type SessionStatus = "ACTIVE" | "LOGGED_OUT" | "REVOKED";
type StatusFilter = "all" | "active" | "logged_out" | "revoked";
type SubjectFilter = "all" | "shop" | "customer" | "admin";

type LoginSession = {
  id: string;
  subjectKind: string;
  roleAtLogin: string | null;
  nameAtLogin: string | null;
  phoneAtLogin: string | null;
  shopNameAtLogin: string | null;
  provider: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  signedInAt: string;
  lastActivityAt: string;
  expiresAt: string | null;
  loggedOutAt: string | null;
  revokedAt: string | null;
  restoredAt?: string | null;
  restorationCount?: number;
  status: SessionStatus;
  onlineNow: boolean;
  isCurrent: boolean;
};

type Counts = Record<string, number | undefined>;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "همه نشست‌ها" },
  { value: "active", label: "فعال" },
  { value: "logged_out", label: "خروج‌شده" },
  { value: "revoked", label: "قطع‌شده" },
];

const SUBJECT_FILTERS: { value: SubjectFilter; label: string }[] = [
  { value: "all", label: "همه کاربران" },
  { value: "shop", label: "تعمیرگاه‌ها" },
  { value: "customer", label: "مشتریان" },
  { value: "admin", label: "مدیران" },
];

function countValue(counts: Counts, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = counts[key];
    if (typeof value === "number") return value;
  }
  return fallback;
}

function subjectLabel(kind: string) {
  const value = kind.toUpperCase();
  if (value.includes("CUSTOMER")) return "مشتری";
  if (value.includes("ADMIN")) return "مدیر پلتفرم";
  if (value.includes("IMPERSON")) return "ورود پشتیبانی";
  if (value.includes("SHOP") || value.includes("OWNER") || value.includes("USER")) return "تعمیرگاه";
  return kind || "کاربر";
}

function roleLabel(role: string | null) {
  if (!role) return null;
  const labels: Record<string, string> = {
    OWNER: "مالک",
    FRONTDESK: "پذیرش",
    HARDWARE: "تعمیرکار سخت‌افزار",
    SOFTWARE: "تعمیرکار نرم‌افزار",
    BOARD: "تعمیرکار برد",
    CUSTOMER: "مشتری",
    SUPERADMIN: "سوپرادمین",
    SUPER_ADMIN: "سوپرادمین",
    PLATFORM_ADMIN: "مدیر پلتفرم",
  };
  return labels[role.toUpperCase()] ?? role;
}

function providerLabel(provider: string | null) {
  if (!provider) return "ورود مستقیم";
  const value = provider.toLowerCase();
  if (value.includes("imperson")) return "ورود پشتیبانی";
  if (value.includes("customer")) return "درگاه مشتری";
  if (value.includes("platform") || value.includes("admin")) return "درگاه سوپرادمین";
  if (value.includes("shop")) return "درگاه تعمیرگاه";
  if (value.includes("credential")) return "شماره و رمز عبور";
  return provider;
}

function relativeActivity(input: string) {
  const time = new Date(input).getTime();
  if (!Number.isFinite(time)) return "نامشخص";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return "همین حالا";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days.toLocaleString("fa-IR")} روز پیش`;
}

function SessionStatusBadge({ session }: { session: LoginSession }) {
  if (session.status === "REVOKED") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-1 text-[10px] font-bold text-danger"><Ban size={11} />قطع‌شده</span>;
  }
  if (session.status === "LOGGED_OUT") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[10px] font-bold text-muted"><LogOut size={11} />خروج‌شده</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${session.onlineNow ? "bg-teal/15 text-teal" : "bg-copper/15 text-copper"}`}>
      <i className={`h-1.5 w-1.5 rounded-full ${session.onlineNow ? "bg-teal shadow-[0_0_8px_currentColor]" : "bg-copper"}`} />
      {session.onlineNow ? "آنلاین" : "فعال"}
    </span>
  );
}

function SubjectIcon({ kind }: { kind: string }) {
  const value = kind.toUpperCase();
  if (value.includes("CUSTOMER")) return <UsersRound size={18} />;
  if (value.includes("ADMIN")) return <ShieldCheck size={18} />;
  if (value.includes("SHOP") || value.includes("OWNER")) return <Store size={18} />;
  return <UserRound size={18} />;
}

function DeviceIcon({ session }: { session: LoginSession }) {
  const label = `${session.deviceLabel ?? ""} ${session.userAgent ?? ""}`.toLowerCase();
  if (label.includes("android") || label.includes("iphone") || label.includes("mobile")) return <Smartphone size={16} />;
  return <Laptop size={16} />;
}

export default function SuperAdminSessionsPage() {
  const { data: authSession, status: authStatus } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<LoginSession | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<LoginSession | null>(null);
  const [restoring, setRestoring] = useState(false);

  const isSuperAdmin = Boolean((authSession?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin);

  useEffect(() => {
    if (authStatus === "unauthenticated" || (authStatus === "authenticated" && !isSuperAdmin)) {
      router.replace("/superadmin/login");
    }
  }, [authStatus, isSuperAdmin, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: statusFilter, type: subjectFilter });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const response = await fetch(`/api/superadmin/sessions?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "دریافت نشست‌ها انجام نشد.");
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setCounts(data.counts && typeof data.counts === "object" ? data.counts : {});
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, subjectFilter]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !isSuperAdmin) return;
    void loadSessions();
    const interval = window.setInterval(() => void loadSessions(true), 30_000);
    return () => window.clearInterval(interval);
  }, [authStatus, isSuperAdmin, loadSessions]);

  async function revokeSession() {
    if (!revokeTarget || revokeTarget.isCurrent) return;
    setRevoking(true);
    setError("");
    try {
      const response = await fetch(`/api/superadmin/sessions/${encodeURIComponent(revokeTarget.id)}/revoke`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "قطع نشست انجام نشد.");
      setNotice(`نشست ${revokeTarget.nameAtLogin || revokeTarget.phoneAtLogin || "کاربر"} با موفقیت قطع شد.`);
      setRevokeTarget(null);
      window.setTimeout(() => setNotice(""), 4500);
      await loadSessions(true);
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "قطع نشست انجام نشد.");
    } finally {
      setRevoking(false);
    }
  }

  async function restoreSession() {
    if (!restoreTarget) return;
    setRestoring(true);
    setError("");
    try {
      const response = await fetch(`/api/superadmin/sessions/${encodeURIComponent(restoreTarget.id)}/restore`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "بازگردانی نشست انجام نشد.");
      setNotice(`نشست ${restoreTarget.nameAtLogin || restoreTarget.phoneAtLogin || "کاربر"} دوباره فعال شد.`);
      setRestoreTarget(null);
      window.setTimeout(() => setNotice(""), 4500);
      await loadSessions(true);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "بازگردانی نشست انجام نشد.");
    } finally {
      setRestoring(false);
    }
  }

  const derivedCounts = useMemo(() => {
    const total = countValue(counts, ["total"], sessions.length);
    const active = countValue(counts, ["active", "ACTIVE"], sessions.filter((item) => item.status === "ACTIVE").length);
    const online = countValue(counts, ["onlineNow", "online", "online_now"], sessions.filter((item) => item.onlineNow).length);
    const revoked = countValue(counts, ["revoked", "REVOKED"], sessions.filter((item) => item.status === "REVOKED").length);
    const loggedOut = countValue(counts, ["loggedOut", "logged_out", "LOGGED_OUT"], sessions.filter((item) => item.status === "LOGGED_OUT").length);
    return { total, active, online, revoked, loggedOut };
  }, [counts, sessions]);

  function statusCount(filter: StatusFilter) {
    if (filter === "active") return derivedCounts.active;
    if (filter === "logged_out") return derivedCounts.loggedOut;
    if (filter === "revoked") return derivedCounts.revoked;
    return derivedCounts.total;
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-6" dir="rtl">
      <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-3 py-1 text-[10px] font-bold text-teal">
            <Wifi size={12} /> پایش امنیتی زنده
          </div>
          <h1 className="text-xl font-black tracking-tight md:text-2xl">نشست‌ها و ورودها</h1>
          <p className="mt-1 max-w-2xl text-[11px] leading-6 text-muted md:text-xs">
            دستگاه‌های واردشده، آخرین فعالیت و مسیر ورود کاربران را ببینید و نشست‌های مشکوک را فوراً قطع کنید.
          </p>
          <p className="mt-2 max-w-2xl rounded-lg border border-amber/20 bg-amber/10 px-2.5 py-2 text-[10px] leading-5 text-amber">
            ورود دوباره، نشست جدیدی می‌سازد و سابقه قطع‌شده را تغییر نمی‌دهد. «بازگردانی» فقط همان توکن قبلی را دوباره معتبر می‌کند؛ پس صرفاً برای نشست مطمئن استفاده شود.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden text-left text-[10px] leading-5 text-muted sm:block">
            <span className="block">به‌روزرسانی خودکار هر ۳۰ ثانیه</span>
            <span>{lastUpdated ? `آخرین دریافت: ${lastUpdated.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "در انتظار نخستین دریافت"}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions(true)}
            disabled={refreshing || authStatus !== "authenticated"}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface2 px-3 text-xs font-bold text-ink transition hover:border-copper/40 hover:text-copper disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> تازه‌سازی
          </button>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={<Wifi size={19} />} label="آنلاین اکنون" value={derivedCounts.online} hint="فعالیت در چند دقیقه اخیر" tone="teal" />
        <SummaryCard icon={<Activity size={19} />} label="نشست فعال" value={derivedCounts.active} hint="دارای مجوز ورود معتبر" tone="blue" />
        <SummaryCard icon={<MonitorSmartphone size={19} />} label="کل ورودها" value={derivedCounts.total} hint="در بازه نگهداری سامانه" tone="violet" />
        <SummaryCard icon={<Ban size={19} />} label="قطع‌شده" value={derivedCounts.revoked} hint="مسدودشده توسط مدیر" tone="red" />
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-surface/80 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur md:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar xl:pb-0">
            {STATUS_FILTERS.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => setStatusFilter(item.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition ${statusFilter === item.value ? "bg-copper text-[#101522] shadow-lg shadow-copper/10" : "bg-surface2 text-muted hover:text-ink"}`}
              >
                {item.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${statusFilter === item.value ? "bg-black/10" : "bg-surface"}`}>{statusCount(item.value).toLocaleString("fa-IR")}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1 sm:min-w-[260px]">
              <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="نام، موبایل، فروشگاه یا IP..."
                className="h-10 w-full rounded-xl border border-border bg-surface2 pr-9 pl-9 text-xs outline-none transition placeholder:text-muted/70 focus:border-copper/50 focus:ring-2 focus:ring-copper/10"
              />
              {search && <button type="button" aria-label="پاک کردن جست‌وجو" onClick={() => setSearch("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"><X size={14} /></button>}
            </label>
            <select
              aria-label="نوع حساب"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value as SubjectFilter)}
              className="h-10 rounded-xl border border-border bg-surface2 px-3 text-[11px] font-bold text-ink outline-none focus:border-copper/50"
            >
              {SUBJECT_FILTERS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {notice && <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal/25 bg-teal/10 px-3 py-2.5 text-xs font-semibold text-teal"><CheckCircle2 size={16} />{notice}</div>}
      {error && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3 py-3 text-xs text-danger sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><AlertTriangle size={16} />{error}</span>
          <button type="button" onClick={() => void loadSessions()} className="self-start rounded-lg bg-danger/15 px-3 py-1.5 font-bold sm:self-auto">تلاش دوباره</button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-extrabold">فهرست ورودها</h2>
            <p className="mt-0.5 text-[10px] text-muted">{sessions.length.toLocaleString("fa-IR")} مورد در این فیلتر</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface2 px-2.5 py-1.5 text-[10px] text-muted"><Clock3 size={12} /> زمان‌ها بر اساس ساعت ایران</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-surface2" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex min-h-[270px] flex-col items-center justify-center px-4 text-center">
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-surface2 text-muted"><MonitorSmartphone size={25} /></span>
            <h3 className="text-sm font-bold">نشستی پیدا نشد</h3>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-muted">فیلترها یا عبارت جست‌وجو را تغییر دهید. ورودهای جدید پس از ثبت، خودکار در این صفحه ظاهر می‌شوند.</p>
            {(search || statusFilter !== "all" || subjectFilter !== "all") && <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setSubjectFilter("all"); }} className="mt-3 rounded-lg bg-copper/15 px-3 py-2 text-[11px] font-bold text-copper">پاک‌کردن همه فیلترها</button>}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-border bg-surface2/60 text-[10px] text-muted">
                    <th className="px-4 py-3 font-semibold">کاربر و حساب</th>
                    <th className="px-3 py-3 font-semibold">دستگاه و مسیر ورود</th>
                    <th className="px-3 py-3 font-semibold">نشانی شبکه</th>
                    <th className="px-3 py-3 font-semibold">زمان ورود</th>
                    <th className="px-3 py-3 font-semibold">آخرین فعالیت</th>
                    <th className="px-3 py-3 font-semibold">وضعیت</th>
                    <th className="px-4 py-3 font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((item) => (
                    <tr key={item.id} className={`border-b border-border/70 text-xs transition last:border-b-0 hover:bg-surface2/40 ${item.isCurrent ? "bg-teal/[0.035]" : ""}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface2 text-copper"><SubjectIcon kind={item.subjectKind} /></span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <b className="max-w-[180px] truncate">{item.nameAtLogin || "کاربر بدون نام"}</b>
                              {item.isCurrent && <span className="rounded-md bg-teal/15 px-1.5 py-0.5 text-[8px] font-bold text-teal">نشست شما</span>}
                            </div>
                            <p className="mt-0.5 max-w-[220px] truncate text-[10px] text-muted">
                              {subjectLabel(item.subjectKind)}{roleLabel(item.roleAtLogin) ? ` · ${roleLabel(item.roleAtLogin)}` : ""}{item.shopNameAtLogin ? ` · ${item.shopNameAtLogin}` : ""}
                            </p>
                            {item.phoneAtLogin && <p className="mt-0.5 text-[10px] text-muted" dir="ltr">{item.phoneAtLogin}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2" title={item.userAgent || undefined}><span className="text-muted"><DeviceIcon session={item} /></span><div><b className="block max-w-[170px] truncate text-[11px]">{item.deviceLabel || "دستگاه ناشناس"}</b><small className="text-[9px] text-muted">{providerLabel(item.provider)}</small></div></div>
                      </td>
                      <td className="px-3 py-3.5"><span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted" dir="ltr"><Globe2 size={12} />{item.ipAddress || "—"}</span></td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-[10px] text-muted">{formatJalaliDateTime(item.signedInAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3.5"><b className="block text-[10px]">{relativeActivity(item.lastActivityAt)}</b><small className="text-[9px] text-muted">{formatJalaliDateTime(item.lastActivityAt)}</small></td>
                      <td className="px-3 py-3.5"><SessionStatusBadge session={item} /></td>
                      <td className="px-4 py-3.5">
                        {item.status === "ACTIVE" && !item.isCurrent ? <button type="button" onClick={() => setRevokeTarget(item)} className="rounded-lg border border-danger/20 bg-danger/10 px-2.5 py-1.5 text-[10px] font-bold text-danger transition hover:bg-danger/20">قطع نشست</button> : item.status === "REVOKED" ? <button type="button" onClick={() => setRestoreTarget(item)} className="rounded-lg border border-teal/20 bg-teal/10 px-2.5 py-1.5 text-[10px] font-bold text-teal transition hover:bg-teal/20">بازگردانی</button> : item.isCurrent ? <span className="text-[9px] text-muted">محافظت‌شده</span> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {sessions.map((item) => (
                <article key={item.id} className={`p-4 ${item.isCurrent ? "bg-teal/[0.035]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface2 text-copper"><SubjectIcon kind={item.subjectKind} /></span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5"><b className="truncate text-xs">{item.nameAtLogin || "کاربر بدون نام"}</b>{item.isCurrent && <span className="rounded-md bg-teal/15 px-1.5 py-0.5 text-[8px] font-bold text-teal">نشست شما</span>}</div>
                        <p className="mt-0.5 truncate text-[10px] text-muted">{subjectLabel(item.subjectKind)}{item.shopNameAtLogin ? ` · ${item.shopNameAtLogin}` : ""}</p>
                      </div>
                    </div>
                    <SessionStatusBadge session={item} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface2/70 p-3 text-[10px]">
                    <div><span className="mb-1 block text-muted">دستگاه</span><b className="flex items-center gap-1.5 truncate"><DeviceIcon session={item} />{item.deviceLabel || "ناشناس"}</b></div>
                    <div><span className="mb-1 block text-muted">شماره / IP</span><b className="block truncate font-mono" dir="ltr">{item.phoneAtLogin || item.ipAddress || "—"}</b></div>
                    <div><span className="mb-1 block text-muted">زمان ورود</span><b>{formatJalaliDateTime(item.signedInAt)}</b></div>
                    <div><span className="mb-1 block text-muted">آخرین فعالیت</span><b>{relativeActivity(item.lastActivityAt)}</b></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-muted">{providerLabel(item.provider)}</span>
                    {item.status === "ACTIVE" && !item.isCurrent && <button type="button" onClick={() => setRevokeTarget(item)} className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-1.5 text-[10px] font-bold text-danger">قطع نشست</button>}
                    {item.status === "REVOKED" && <button type="button" onClick={() => setRestoreTarget(item)} className="rounded-lg border border-teal/20 bg-teal/10 px-3 py-1.5 text-[10px] font-bold text-teal">بازگردانی</button>}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {revokeTarget && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#050914]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="revoke-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !revoking) setRevokeTarget(null); }}>
          <div className="w-full max-w-md rounded-2xl border border-danger/25 bg-surface p-5 shadow-2xl">
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-danger/15 text-danger"><Ban size={21} /></span>
            <h2 id="revoke-title" className="text-base font-extrabold">این نشست قطع شود؟</h2>
            <p className="mt-2 text-[11px] leading-6 text-muted">دسترسی <b className="text-ink">{revokeTarget.nameAtLogin || revokeTarget.phoneAtLogin || "این کاربر"}</b> روی دستگاه «{revokeTarget.deviceLabel || "ناشناس"}» باطل می‌شود و برای ادامه باید دوباره وارد حساب شود.</p>
            <div className="mt-4 rounded-xl border border-border bg-surface2 p-3 text-[10px] text-muted">
              <div className="flex justify-between gap-3"><span>آخرین فعالیت</span><b className="text-ink">{formatJalaliDateTime(revokeTarget.lastActivityAt)}</b></div>
              <div className="mt-2 flex justify-between gap-3"><span>نشانی IP</span><b className="font-mono text-ink" dir="ltr">{revokeTarget.ipAddress || "نامشخص"}</b></div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => void revokeSession()} disabled={revoking} className="flex-[2] rounded-xl bg-danger px-4 py-2.5 text-xs font-extrabold text-white transition hover:brightness-110 disabled:opacity-60">{revoking ? "در حال قطع نشست..." : "بله، نشست را قطع کن"}</button>
              <button type="button" onClick={() => setRevokeTarget(null)} disabled={revoking} className="flex-1 rounded-xl border border-border bg-surface2 px-4 py-2.5 text-xs font-bold text-muted disabled:opacity-60">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {restoreTarget && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#050914]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="restore-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !restoring) setRestoreTarget(null); }}>
          <div className="w-full max-w-md rounded-2xl border border-teal/25 bg-surface p-5 shadow-2xl">
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-teal/15 text-teal"><RefreshCw size={21} /></span>
            <h2 id="restore-title" className="text-base font-extrabold">این نشست دوباره فعال شود؟</h2>
            <p className="mt-2 text-[11px] leading-6 text-muted">توکن قبلی <b className="text-ink">{restoreTarget.nameAtLogin || restoreTarget.phoneAtLogin || "این کاربر"}</b> دوباره اجازه دسترسی می‌گیرد. این کار را فقط زمانی انجام دهید که دستگاه و ورود را می‌شناسید.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => void restoreSession()} disabled={restoring} className="flex-[2] rounded-xl bg-teal px-4 py-2.5 text-xs font-extrabold text-white transition hover:brightness-110 disabled:opacity-60">{restoring ? "در حال بازگردانی..." : "بله، نشست را بازگردان"}</button>
              <button type="button" onClick={() => setRestoreTarget(null)} disabled={restoring} className="flex-1 rounded-xl border border-border bg-surface2 px-4 py-2.5 text-xs font-bold text-muted disabled:opacity-60">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: number; hint: string; tone: "teal" | "blue" | "violet" | "red" }) {
  const tones = {
    teal: "border-teal/20 bg-teal/10 text-teal",
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    red: "border-danger/20 bg-danger/10 text-danger",
  };
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-surface2 p-3.5 md:p-4">
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl border ${tones[tone]}`}>{icon}</div>
      <span className="text-[10px] font-semibold text-muted md:text-[11px]">{label}</span>
      <b className="mt-0.5 block text-xl font-black tracking-tight md:text-2xl">{value.toLocaleString("fa-IR")}</b>
      <p className="mt-1 truncate text-[9px] text-muted md:text-[10px]">{hint}</p>
    </article>
  );
}
