"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی",
};
const LANE_LABEL: Record<string, string> = { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی" };

type Staff = { id: string; name: string; phone: string; role: string; active: boolean };
type ReportRow = { techId: string; name: string; role: string; closedCount: number; revenue: number };
type ShopInfo = { name: string; address: string | null; phone: string | null; plan: string; bankCardNumber?: string | null; bankAccountNumber?: string | null };
type Template = { id: string; lane: string; label: string };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "HARDWARE" });
  const [error, setError] = useState("");

  const [shopInfo, setShopInfo] = useState<ShopInfo>({ name: "", address: "", phone: "", plan: "free", bankCardNumber: "", bankAccountNumber: "" });
  const [shopSaved, setShopSaved] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState(1);
  const [verificationRequestedAt, setVerificationRequestedAt] = useState<string | null>(null);
  const [verifSubmitted, setVerifSubmitted] = useState(false);

  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplateLane, setNewTemplateLane] = useState("HARDWARE");
  const [newTemplateLabel, setNewTemplateLabel] = useState("");

  const isOwner = (session?.user as any)?.role === "OWNER";

  async function load() {
    const [sRes, rRes, shopRes, catRes, tplRes] = await Promise.all([
      fetch("/api/staff"), fetch("/api/reports/staff"), fetch("/api/shop"),
      fetch("/api/device-catalog"), fetch("/api/issue-templates"),
    ]);
    if (sRes.ok) setStaff((await sRes.json()).staff ?? []);
    if (rRes.ok) {
      const data = await rRes.json();
      setReport(data.staff ?? []);
      setMonthRevenue(data.last30DaysRevenue ?? 0);
    }
    if (shopRes.ok) {
      const data = await shopRes.json();
      setShopInfo({
        name: data.shop.name, address: data.shop.address ?? "", phone: data.shop.phone ?? "", plan: data.shop.plan,
        bankCardNumber: data.shop.bankCardNumber ?? "", bankAccountNumber: data.shop.bankAccountNumber ?? "",
      });
      setVerificationLevel(data.shop.verificationLevel ?? 1);
      setVerificationRequestedAt(data.shop.verificationRequestedAt ?? null);
    }
    if (catRes.ok) {
      const data = await catRes.json();
      setCatalog(data.catalog ?? {});
      setFavoriteBrands(data.favoriteBrands ?? []);
    }
    if (tplRes.ok) setTemplates((await tplRes.json()).templates ?? []);
  }
  useEffect(() => { if (isOwner) load(); }, [isOwner]);

  async function addStaff() {
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "افزودن کارمند ناموفق بود");
      return;
    }
    setForm({ name: "", phone: "", password: "", role: "HARDWARE" });
    load();
  }

  async function saveShopInfo() {
    setShopSaved(false);
    const res = await fetch("/api/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: shopInfo.name, address: shopInfo.address, phone: shopInfo.phone,
        bankCardNumber: shopInfo.bankCardNumber, bankAccountNumber: shopInfo.bankAccountNumber,
      }),
    });
    if (res.ok) { setShopSaved(true); setTimeout(() => setShopSaved(false), 2500); }
  }

  async function requestVerification() {
    const res = await fetch("/api/verification/request", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setVerificationLevel(data.shop.verificationLevel);
      setVerificationRequestedAt(data.shop.verificationRequestedAt);
      setVerifSubmitted(true);
    }
  }

  async function toggleFavoriteBrand(brand: string) {
    const isFav = favoriteBrands.includes(brand);
    await fetch("/api/device-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand, favorite: !isFav }),
    });
    setFavoriteBrands(isFav ? favoriteBrands.filter((b) => b !== brand) : [...favoriteBrands, brand]);
  }

  async function addTemplate() {
    if (!newTemplateLabel.trim()) return;
    const res = await fetch("/api/issue-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane: newTemplateLane, label: newTemplateLabel.trim() }),
    });
    if (res.ok) {
      setNewTemplateLabel("");
      load();
    }
  }

  async function removeTemplate(id: string) {
    await fetch("/api/issue-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (status === "loading") return <p className="p-4 text-sm text-muted">در حال بارگذاری...</p>;
  if (!isOwner) {
    return <p className="p-4 text-sm text-muted">این بخش فقط برای مدیر مغازه قابل دسترسی است.</p>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">پنل مدیریت</h1>

      <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4 mb-6 shadow-lg shadow-black/20">
        <div className="text-xs text-muted mb-1">درآمد ۳۰ روز اخیر</div>
        <div className="text-2xl font-extrabold mono text-copper">{monthRevenue.toLocaleString("fa-IR")} <span className="text-xs font-normal text-ink">تومان</span></div>
      </div>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted mb-1">سطح احراز هویت</div>
          <div className="text-sm font-bold">
            سطح {verificationLevel} از ۳
            {verificationLevel === 1 && <span className="text-muted font-normal"> — تازه ثبت‌نام شده</span>}
            {verificationLevel === 2 && <span className="text-amber font-normal"> — منتظر تأیید پلتفرم</span>}
            {verificationLevel === 3 && <span className="text-teal font-normal"> — تأییدشده ✅</span>}
          </div>
        </div>
        {verificationLevel < 3 && !verificationRequestedAt && (
          <button onClick={requestVerification} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3 py-2">
            {verifSubmitted ? "ارسال شد" : "درخواست ارتقا"}
          </button>
        )}
      </div>

      {/* Shop info / address / bank settings */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">اطلاعات مغازه</div>
        <label className="block text-xs text-muted mb-1">نام مغازه</label>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={shopInfo.name} onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })} />
        <label className="block text-xs text-muted mb-1">آدرس</label>
        <textarea className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="آدرس کامل مغازه برای نمایش به مشتریان"
          value={shopInfo.address ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })} />
        <label className="block text-xs text-muted mb-1">تلفن مغازه</label>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={shopInfo.phone ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })} />
        <label className="block text-xs text-muted mb-1">شماره کارت (برای درج در فاکتور/پیامک)</label>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3 mono"
          value={shopInfo.bankCardNumber ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, bankCardNumber: e.target.value })} />
        <label className="block text-xs text-muted mb-1">شماره حساب</label>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3 mono"
          value={shopInfo.bankAccountNumber ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, bankAccountNumber: e.target.value })} />
        <button onClick={saveShopInfo} className="w-full bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors font-bold rounded-lg py-2.5 text-sm">
          {shopSaved ? "✅ ذخیره شد" : "ذخیره تغییرات"}
        </button>
      </div>

      {/* Favorite brands */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-1">برندهای پرکاربرد</div>
        <p className="text-[11px] text-muted mb-3">برندهایی که تیک بزنید، بالای لیست فرم پذیرش دستگاه نمایش داده می‌شوند.</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(catalog).map((brand) => (
            <button key={brand} onClick={() => toggleFavoriteBrand(brand)}
              className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
                favoriteBrands.includes(brand) ? "bg-copper text-[#1A1410] border-copper" : "bg-surface2 border-surface2 text-muted"
              }`}>
              {brand} {favoriteBrands.includes(brand) && "⭐"}
            </button>
          ))}
        </div>
      </div>

      {/* Issue templates */}
      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">الگوهای شرح ایراد</div>
        <div className="flex gap-2 mb-3">
          <select className="bg-surface2 rounded-lg px-2 py-2 text-xs" value={newTemplateLane} onChange={(e) => setNewTemplateLane(e.target.value)}>
            {Object.entries(LANE_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
          <input className="flex-1 bg-surface2 rounded-lg px-3 py-2 text-xs" placeholder="مثلاً: تعویض دوربین"
            value={newTemplateLabel} onChange={(e) => setNewTemplateLabel(e.target.value)} />
          <button onClick={addTemplate} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3">افزودن</button>
        </div>
        {Object.keys(LANE_LABEL).map((lane) => (
          <div key={lane} className="mb-2">
            <div className="text-[11px] text-muted mb-1">{LANE_LABEL[lane]}</div>
            <div className="flex flex-wrap gap-1.5">
              {templates.filter((t) => t.lane === lane).map((t) => (
                <span key={t.id} className="text-[10px] bg-surface2 rounded-full pl-1 pr-2.5 py-1 flex items-center gap-1.5">
                  {t.label}
                  <button onClick={() => removeTemplate(t.id)} className="text-danger">✕</button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">افزودن کارمند جدید</div>
        <input placeholder="نام" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="شماره موبایل" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="رمز عبور موقت" type="password" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-2"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLE_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        {error && <p className="text-danger text-xs mb-2">{error}</p>}
        <button onClick={addStaff} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm hover:brightness-110 transition">
          افزودن کارمند
        </button>
      </div>

      <div className="text-sm font-bold mb-2">اعضای تیم</div>
      <div className="space-y-2 mb-6">
        {staff.map((s) => (
          <StaffRow key={s.id} staff={s} onSaved={load} />
        ))}
      </div>

      <div className="text-sm font-bold mb-2">گزارش بهره‌وری (دستگاه‌های تحویل‌شده)</div>
      <div className="space-y-2">
        {report.map((r) => (
          <div key={r.techId} className="flex justify-between bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs">
            <span>{r.name} · {ROLE_LABEL[r.role] ?? r.role}</span>
            <span className="mono">{r.closedCount} دستگاه · {r.revenue.toLocaleString("fa-IR")} تومان</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffRow({ staff, onSaved }: { staff: Staff; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(staff.name);
  const [role, setRole] = useState(staff.role);
  const [active, setActive] = useState(staff.active);

  async function save() {
    await fetch(`/api/staff/${staff.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, active }),
    });
    setEditing(false);
    onSaved();
  }

  if (!editing) {
    return (
      <div className={`flex justify-between items-center bg-surface2 border rounded-lg px-3 py-2 text-xs ${staff.active ? "border-surface2" : "border-danger"}`}>
        <span>{staff.name} · {staff.phone} {!staff.active && <span className="text-danger">(غیرفعال)</span>}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted">{ROLE_LABEL[staff.role] ?? staff.role}</span>
          <button onClick={() => setEditing(true)} className="text-copper text-[10px] font-semibold">ویرایش</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface2 border border-copper rounded-lg p-3 text-xs space-y-2">
      <input className="w-full bg-surface rounded-lg px-2 py-1.5 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="w-full bg-surface rounded-lg px-2 py-1.5 text-xs" value={role} onChange={(e) => setRole(e.target.value)}>
        {Object.entries(ROLE_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>
      <label className="flex items-center gap-2 text-[11px] text-muted">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        حساب فعال باشد
      </label>
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-1.5">ذخیره</button>
        <button onClick={() => setEditing(false)} className="flex-1 bg-surface rounded-lg py-1.5">انصراف</button>
      </div>
    </div>
  );
}
