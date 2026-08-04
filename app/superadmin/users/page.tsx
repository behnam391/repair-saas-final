"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type U = { id: string; name: string; phone: string; email: string | null; role: string; active: boolean; shop: { name: string; supportAccessEnabled: boolean } };

export default function SuperAdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<U[]>([]);
  const [search, setSearch] = useState("");
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
    if (!/^09\d{9}$/.test(editForm.phone.trim())) { setEditErr("شماره باید ۱۱ رقمی و با ۰۹ باشد"); return; }
    const res = await fetch(`/api/superadmin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, phone: editForm.phone.trim() }),
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

  useEffect(() => {
    fetch("/api/superadmin/users").then((r) => r.json()).then((d) => setUsers(d.users ?? []));
  }, []);

  const filtered = users.filter((u) => u.name.includes(search) || u.phone.includes(search) || (u.email ?? "").includes(search));

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
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">کاربران پلتفرم</h1>
      <p className="text-[11px] text-muted mb-4">
        برای کمک به بازیابی حساب کاربرانی که به شماره موبایل خود دسترسی ندارند، ابتدا هویت آن‌ها را از طریق روش‌های دیگر (ایمیل، مدارک) تأیید کنید و سپس رمز موقت تعیین نمایید.
      </p>
      <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4"
        placeholder="جستجو با نام، شماره یا ایمیل..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {msg && <p className="text-teal text-xs mb-3">{msg}</p>}
      {impersonateError && <p className="text-danger text-xs mb-3">{impersonateError}</p>}
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{u.name} · {u.phone}</div>
                <div className="text-muted mt-0.5">{u.shop.name} · {u.email || "بدون ایمیل"}</div>
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
                  value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
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
      </div>
    </div>
  );
}
