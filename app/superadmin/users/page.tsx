"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type U = { id: string; name: string; phone: string; email: string | null; role: string; active: boolean; shop: { name: string } };

export default function SuperAdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<U[]>([]);
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

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
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{u.name} · {u.phone}</div>
                <div className="text-muted mt-0.5">{u.shop.name} · {u.email || "بدون ایمیل"}</div>
              </div>
              <button onClick={() => setResetTarget(resetTarget === u.id ? null : u.id)} className="text-[10px] bg-danger/20 text-danger rounded-lg px-2 py-1">
                بازنشانی رمز
              </button>
            </div>
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
