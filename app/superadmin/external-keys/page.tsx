"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Key = { id: string; label: string; apiKey: string; active: boolean; createdAt: string };

export default function ExternalKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<Key[]>([]);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function load() {
    const res = await fetch("/api/superadmin/external-keys");
    if (res.ok) setKeys((await res.json()).keys ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!label.trim()) return;
    const res = await fetch("/api/superadmin/external-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key.apiKey);
      setLabel("");
      load();
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/superadmin/external-keys/${id}`, { method: "PATCH" });
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">دسترسی API برای سازمان‌های بیرونی</h1>
      <p className="text-[11px] text-muted mb-4">
        ⚠️ این کلیدها دسترسی به یک API فقط‌خواندنی از داده‌های گزارش‌شده (پرچم‌های مسروقه/بدهی و زنجیره مالکیت) می‌دهند —
        استعلام رسمی از سامانه‌های اصناف/تعزیرات/مالیات نیست، چون چنین APIای عمومی در دسترس ما نبوده. این صرفاً خروجی خودمان است
        که در صورت تمایل آن نهادها، می‌توان به آن‌ها متصل کرد.
      </p>

      {newKey && (
        <div className="bg-teal/10 border border-teal/40 rounded-lg p-3 mb-4 text-xs">
          کلید جدید (فقط یک‌بار نمایش داده می‌شود، جایی ذخیره کنید):
          <div className="mono font-bold mt-1 break-all">{newKey}</div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="نام سازمان (مثلاً اتحادیه اصناف موبایل ایران)"
          value={label} onChange={(e) => setLabel(e.target.value)} />
        <button onClick={create} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-4">ساخت کلید</button>
      </div>

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs flex justify-between items-center">
            <div>
              <div className="font-bold">{k.label}</div>
              <div className="text-muted mono mt-0.5">{k.apiKey.slice(0, 10)}...{k.active ? "" : " (غیرفعال)"}</div>
            </div>
            {k.active && <button onClick={() => revoke(k.id)} className="text-danger text-[10px] font-semibold">لغو دسترسی</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
