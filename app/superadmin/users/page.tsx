"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toLatinDigits, normalizePhone, isValidMobile } from "@/lib/phone";
import { ChevronLeft, ChevronRight, Search, UsersRound } from "lucide-react";

type U = { id: string; name: string; phone: string; email: string | null; role: string; active: boolean; shop: { id: string; name: string; supportAccessEnabled: boolean } };
const ROLE_LABEL: Record<string,string> = { OWNER:"مالک", FRONTDESK:"پذیرش", HARDWARE:"سخت‌افزار", SOFTWARE:"نرم‌افزار", BOARD:"تعمیر برد" };

export default function SuperAdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<U[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [shops, setShops] = useState<{id:string;name:string}[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 15;
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [impersonateError, setImpersonateError] = useState("");
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [editErr, setEditErr] = useState("");

  function startEdit(u: U) {
    setEditTarget(editTarget === u.id ? null : u.id);
    setEditForm({ name: u.name, phone: u.phone });
    setEditErr("");
  }

  async function saveEdit(id: string) {
    setEditErr("");
    // This is the fix-a-locked-out-owner screen — the number it writes has
    // to be the exact form the login page looks up. See lib/phone.ts.
    if (!isValidMobile(editForm.phone)) { setEditErr("شماره باید ۱۱ رقمی و با ۰۹ باشد"); return; }
    const res = await fetch(`/api/superadmin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, phone: normalizePhone(editForm.phone) }),
    });
    if (res.ok) {
      const { user } = await res.json();
      setUsers((us) => us.map((x) => (x.id === id ? { ...x, name: user.name, phone: user.phone } : x)));
      setEditTarget(null);
      setMsg("اطلاعات کاربر به‌روزرسانی شد.");
    } else {
      const d = await res.json().catch(() => ({}));
      setEditErr(d.message || "ذخیره ناموفق بود");
    }
  }

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function load(requestedPage = page) {
    setLoading(true);
    const params = new URLSearchParams({ page:String(requestedPage), pageSize:String(pageSize) });
    if (search) params.set("q", search); if (roleFilter) params.set("role", roleFilter); if (shopFilter) params.set("shop", shopFilter); if (activeFilter) params.set("active", activeFilter);
    const d = await fetch(`/api/superadmin/users?${params}`).then(r => r.json());
    setUsers(d.users ?? []); setTotal(d.total ?? 0); setShops(d.shops ?? []); setLoading(false);
  }
  useEffect(() => { load(page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  async function doReset(id: string) {
    if (newPassword.length < 4) return;
    const res = await fetch(`/api/superadmin/users/${id}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    if (res.ok) { setMsg("رمز عبور با موفقیت تغییر کرد."); setResetTarget(null); setNewPassword(""); }
  }

  async function impersonate(id: string) {
    setImpersonateError("");
    const res = await fetch(`/api/superadmin/users/${id}/impersonate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setImpersonateError(data.message || "این عملیات ناموفق بود"); return; }
    window.open(data.url, "_blank");
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <div className="flex items-center gap-3 mt-2 mb-1"><span className="w-11 h-11 grid place-items-center rounded-2xl bg-copper/10 text-copper"><UsersRound size={21}/></span><h1 className="font-extrabold text-lg">کاربران پلتفرم</h1></div>
      <p className="text-[11px] text-muted mb-4">
        برای کمک به بازیابی حساب کاربرانی که به شماره موبایل خود دسترسی ندارند، ابتدا هویت آن‌ها را از طریق روش‌های دیگر (ایمیل، مدارک) تأیید کنید و سپس رمز موقت تعیین نمایید.
      </p>
      <div className="grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 mb-4 bg-surface border border-border rounded-2xl p-2"><div className="flex items-center gap-2 bg-surface2 rounded-xl px-3"><Search size={16} className="text-muted"/><input className="w-full bg-transparent py-2 text-sm" placeholder="نام، شماره یا ایمیل..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(setPage(1),load(1))}/></div><select className="bg-surface2 rounded-xl px-2 text-xs" value={shopFilter} onChange={e=>setShopFilter(e.target.value)}><option value="">همه مغازه‌ها</option>{shops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select className="bg-surface2 rounded-xl px-2 text-xs" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="">همه نقش‌ها</option>{Object.entries(ROLE_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select className="bg-surface2 rounded-xl px-2 text-xs" value={activeFilter} onChange={e=>setActiveFilter(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="true">فعال</option><option value="false">غیرفعال</option></select><button onClick={()=>{setPage(1);load(1)}} className="bg-copper text-white rounded-xl px-4 py-2 text-xs font-bold">اعمال</button></div>
      {msg && <p className="text-teal text-xs mb-3">{msg}</p>}
      {impersonateError && <p className="text-danger text-xs mb-3">{impersonateError}</p>}
      <div className="space-y-2">
        {loading ? <p className="text-center text-sm text-muted py-8">در حال بارگذاری...</p> : users.map((u) => (
          <div key={u.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{u.name} · {u.phone}</div>
                <div className="text-muted mt-0.5">{u.shop.name} · {ROLE_LABEL[u.role] ?? u.role} · {u.email || "بدون ایمیل"}</div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => startEdit(u)} className="text-[10px] bg-teal/20 text-teal rounded-lg px-2 py-1">
                  ویرایش نام/شماره
                </button>
                <button onClick={() => setResetTarget(resetTarget === u.id ? null : u.id)} className="text-[10px] bg-danger/20 text-danger rounded-lg px-2 py-1">
                  بازنشانی رمز
                </button>
                <button
                  onClick={() => impersonate(u.id)}
                  disabled={!u.shop.supportAccessEnabled}
                  title={!u.shop.supportAccessEnabled ? "این مغازه دسترسی پشتیبانی را فعال نکرده است" : ""}
                  className={`text-[10px] rounded-lg px-2 py-1 ${u.shop.supportAccessEnabled ? "bg-copper/20 text-copper" : "bg-surface text-muted cursor-not-allowed"}`}
                >
                  ورود به‌جای کاربر
                </button>
              </div>
            </div>
            {editTarget === u.id && (
              <div className="mt-2 space-y-1.5 bg-surface rounded-lg p-2">
                <input className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="نام"
                  value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <input className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs mono" dir="ltr" inputMode="tel" maxLength={11} placeholder="شماره موبایل"
                  value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: toLatinDigits(e.target.value) })} />
                {editErr && <p className="text-danger text-[10px]">{editErr}</p>}
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(u.id)} className="flex-1 bg-teal text-white text-xs font-bold rounded-lg py-1.5">ذخیره</button>
                  <button onClick={() => setEditTarget(null)} className="flex-1 bg-surface2 rounded-lg py-1.5 text-xs">انصراف</button>
                </div>
              </div>
            )}
            {resetTarget === u.id && (
              <div className="flex gap-2 mt-2">
                <input type="password" className="flex-1 bg-surface rounded-lg px-2 py-1.5 text-xs" placeholder="رمز جدید"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button onClick={() => doReset(u.id)} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3">ثبت</button>
              </div>
            )}
          </div>
        ))}
        {!loading && <div className="super-pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronRight size={15}/> قبلی</button><span>صفحه {page.toLocaleString("fa-IR")} از {Math.max(1,Math.ceil(total/pageSize)).toLocaleString("fa-IR")} · {total.toLocaleString("fa-IR")} کاربر</span><button disabled={page>=Math.ceil(total/pageSize)} onClick={()=>setPage(p=>p+1)}>بعدی <ChevronLeft size={15}/></button></div>}
      </div>
    </div>
  );
}
