"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const SCOPES = [
  { key: "device_flags", label: "گزارش‌های هشدار دستگاه (مسروقه/بدهی)" },
  { key: "device_transactions", label: "زنجیره مالکیت/خرید و فروش دستگاه" },
  { key: "shop_directory", label: "فهرست و مشخصات مغازه‌های عضو" },
  { key: "shop_verification", label: "وضعیت احراز هویت مغازه‌ها" },
  { key: "ratings", label: "امتیاز و نظرات مشتریان" },
];

type Key = { id: string; label: string; apiKey: string; active: boolean; scopes: string; createdAt: string };

export default function ExternalKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<Key[]>([]);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["device_flags", "device_transactions"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [editingScopesId, setEditingScopesId] = useState<string | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function load() {
    const res = await fetch("/api/superadmin/external-keys");
    if (res.ok) setKeys((await res.json()).keys ?? []);
  }
  useEffect(() => { load(); }, []);

  function toggleScope(list: string[], setList: (v: string[]) => void, key: string) {
    setList(list.includes(key) ? list.filter((s) => s !== key) : [...list, key]);
  }

  async function create() {
    if (!label.trim() || scopes.length === 0) return;
    const res = await fetch("/api/superadmin/external-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, scopes }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key.apiKey);
      setLabel("");
      setScopes(["device_flags", "device_transactions"]);
      load();
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/superadmin/external-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    load();
  }

  function startEditScopes(k: Key) {
    setEditingScopesId(k.id);
    setEditScopes(k.scopes.split(",").filter(Boolean));
  }

  async function saveScopes(id: string) {
    await fetch(`/api/superadmin/external-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scopes: editScopes }),
    });
    setEditingScopesId(null);
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">دسترسی API برای سازمان‌های بیرونی</h1>
      <p className="text-[11px] text-muted mb-4">
        ⚠️ این کلیدها دسترسی به یک API فقط‌خواندنی از داده‌های خودمان می‌دهند — استعلام رسمی و تأییدشده از سامانه‌های
        اصناف/تعزیرات/مالیات نیست، چون چنین APIای عمومی در دسترس نبوده؛ این زیرساخت آماده است تا هر زمان آن نهادها
        بخواهند متصل شوند. برای اضافه‌کردن یک دسته داده جدید در آینده، فقط از طریق تیم فنی امکان‌پذیر است؛ اما دسته‌های
        فعلی کاملاً از همین صفحه (بدون کدنویسی) به هر سازمان قابل اعطا یا لغو است.
      </p>

      {newKey && (
        <div className="bg-teal/10 border border-teal/40 rounded-lg p-3 mb-4 text-xs">
          کلید جدید (فقط یک‌بار نمایش داده می‌شود، جایی ذخیره کنید):
          <div className="mono font-bold mt-1 break-all">{newKey}</div>
        </div>
      )}

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6 space-y-2">
        <input className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="نام سازمان (مثلاً اتحادیه اصناف موبایل ایران)"
          value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="text-[11px] text-muted mb-1">دسته‌های داده مجاز:</div>
        <div className="space-y-1.5">
          {SCOPES.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={scopes.includes(s.key)} onChange={() => toggleScope(scopes, setScopes, s.key)} />
              {s.label}
            </label>
          ))}
        </div>
        <button onClick={create} className="w-full bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-4 py-2">ساخت کلید</button>
      </div>

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{k.label}</div>
                <div className="text-muted mono mt-0.5">{k.apiKey.slice(0, 10)}...{k.active ? "" : " (غیرفعال)"}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEditScopes(k)} className="text-copper text-[10px] font-semibold">ویرایش دسترسی‌ها</button>
                {k.active && <button onClick={() => revoke(k.id)} className="text-danger text-[10px] font-semibold">لغو دسترسی</button>}
              </div>
            </div>
            <div className="text-muted mt-1">
              {k.scopes.split(",").map((sc) => SCOPES.find((s) => s.key === sc)?.label).filter(Boolean).join("، ")}
            </div>
            {editingScopesId === k.id && (
              <div className="bg-surface rounded-lg p-2.5 mt-2 space-y-1.5">
                {SCOPES.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-[11px]">
                    <input type="checkbox" checked={editScopes.includes(s.key)} onChange={() => toggleScope(editScopes, setEditScopes, s.key)} />
                    {s.label}
                  </label>
                ))}
                <div className="flex gap-2 mt-1">
                  <button onClick={() => saveScopes(k.id)} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-1.5">ذخیره</button>
                  <button onClick={() => setEditingScopesId(null)} className="flex-1 bg-surface2 rounded-lg py-1.5">انصراف</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
