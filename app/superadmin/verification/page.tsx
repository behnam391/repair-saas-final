"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const SIZE_LABEL: Record<string, string> = { SOLO: "تک‌نفره", TEAM: "تیمی", ENTERPRISE: "مجموعه بزرگ" };

type ShopReq = {
  id: string; name: string; address: string | null; phone: string | null; landlinePhone: string | null;
  businessSize: string; specialties: string | null; verificationLevel: number; verificationRequestedAt: string;
  users: { name: string; phone: string; nationalId: string | null; birthDate: string | null }[];
};

export default function SuperAdminVerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [shops, setShops] = useState<ShopReq[]>([]);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function load() {
    const res = await fetch("/api/superadmin/verification");
    if (res.ok) setShops((await res.json()).shops ?? []);
  }
  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    await fetch(`/api/superadmin/verification/${id}/approve`, { method: "PATCH" });
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-4">درخواست‌های ارتقای سطح احراز هویت</h1>
      <div className="space-y-3">
        {shops.length === 0 && <p className="text-xs text-muted">درخواستی موجود نیست.</p>}
        {shops.map((s) => {
          const owner = s.users[0];
          return (
            <div key={s.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-muted mt-0.5">{SIZE_LABEL[s.businessSize] ?? s.businessSize} · تخصص‌ها: {s.specialties || "—"}</div>
                  <div className="text-muted mt-0.5">{s.address || "بدون آدرس"} · {s.landlinePhone || "بدون تلفن ثابت"}</div>
                  {owner && (
                    <div className="text-muted mt-0.5">
                      مدیر: {owner.name} · {owner.phone} · کد ملی: {owner.nationalId || "—"} · تولد: {owner.birthDate ? new Date(owner.birthDate).toLocaleDateString("fa-IR") : "—"}
                    </div>
                  )}
                  <div className="mt-1">سطح فعلی: <span className="font-bold">{s.verificationLevel}</span></div>
                </div>
                {s.verificationLevel < 3 && (
                  <button onClick={() => approve(s.id)} className="bg-teal/20 text-teal text-[11px] font-semibold rounded-lg px-2.5 py-1.5 shrink-0">
                    تأیید سطح ۳
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
