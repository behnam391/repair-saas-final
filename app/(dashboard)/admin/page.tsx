"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PROVINCE_NAMES } from "@/lib/iran-locations";
import LocationPicker from "@/components/LocationPicker";
import JalaliDatePicker from "@/components/JalaliDatePicker";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی",
};
const LANE_LABEL: Record<string, string> = { HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی" };

type Staff = { id: string; name: string; phone: string; role: string; active: boolean };
type ReportRow = { techId: string; name: string; role: string; closedCount: number; revenue: number };
type ShopInfo = { id?: string; name: string; type?: string; address: string | null; phone: string | null; plan: string; bankCardNumber?: string | null; bankAccountNumber?: string | null; latitude?: number | null; longitude?: number | null; province?: string | null; taxPercent?: number };
type Template = { id: string; lane: string; label: string };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthlyChart, setMonthlyChart] = useState<{ label: string; repair: number; sale: number; total: number }[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "HARDWARE" });
  const [error, setError] = useState("");

  const [shopInfo, setShopInfo] = useState<ShopInfo>({ name: "", address: "", phone: "", plan: "free", bankCardNumber: "", bankAccountNumber: "" });
  const [shopSaved, setShopSaved] = useState(false);
  const [shopSaveError, setShopSaveError] = useState("");
  const [verificationLevel, setVerificationLevel] = useState(1);
  const [verificationRequestedAt, setVerificationRequestedAt] = useState<string | null>(null);
  const [verifSubmitted, setVerifSubmitted] = useState(false);
  const [neshanApiKey, setNeshanApiKey] = useState("");

  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplateLane, setNewTemplateLane] = useState("HARDWARE");
  const [newTemplateLabel, setNewTemplateLabel] = useState("");

  const isOwner = (session?.user as any)?.role === "OWNER";

  async function load() {
    const [sRes, rRes, shopRes, catRes, tplRes, platformRes] = await Promise.all([
      fetch("/api/staff"), fetch("/api/reports/staff"), fetch("/api/shop"),
      fetch("/api/device-catalog"), fetch("/api/issue-templates"), fetch("/api/platform-info"),
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
        id: data.shop.id, name: data.shop.name, type: data.shop.type ?? "REPAIR", address: data.shop.address ?? "", phone: data.shop.phone ?? "", plan: data.shop.plan,
        bankCardNumber: data.shop.bankCardNumber ?? "", bankAccountNumber: data.shop.bankAccountNumber ?? "",
        latitude: data.shop.latitude ?? null, longitude: data.shop.longitude ?? null, province: data.shop.province ?? "",
        taxPercent: data.shop.taxPercent ?? 10,
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
    if (platformRes.ok) setNeshanApiKey((await platformRes.json()).neshanApiKey ?? "");
    fetch("/api/reports/monthly-revenue").then(async (r) => {
      if (r.ok) setMonthlyChart((await r.json()).months ?? []);
    });
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
    setShopSaveError("");
    const res = await fetch("/api/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: shopInfo.name, type: shopInfo.type, address: shopInfo.address, phone: shopInfo.phone,
        bankCardNumber: shopInfo.bankCardNumber, bankAccountNumber: shopInfo.bankAccountNumber,
        latitude: shopInfo.latitude ?? undefined, longitude: shopInfo.longitude ?? undefined, province: shopInfo.province || undefined,
        taxPercent: shopInfo.taxPercent ?? undefined,
      }),
    });
    if (res.ok) { setShopSaved(true); setTimeout(() => setShopSaved(false), 2500); }
    else {
      const err = await res.json().catch(() => ({}));
      setShopSaveError(err.message || `ذخیره ناموفق بود (کد ${res.status})`);
    }
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

      <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4 mb-4 shadow-lg shadow-black/20">
        <div className="text-xs text-muted mb-1">درآمد ۳۰ روز اخیر</div>
        <div className="text-2xl font-extrabold mono text-copper">{monthRevenue.toLocaleString("fa-IR")} <span className="text-xs font-normal text-ink">تومان</span></div>
      </div>

      {/* ── Monthly revenue chart + Excel exports ─────────────────── */}
      <Section title="نمودار درآمد و خروجی اکسل" icon="📈" defaultOpen>
        <div className="text-sm font-bold mb-1">نمودار درآمد ۱۲ ماه اخیر</div>
        <p className="text-[10px] text-muted mb-3">
          <span className="text-copper">■</span> فاکتور تعمیر &nbsp;
          <span className="text-teal">■</span> فروش مستقیم
        </p>
        {monthlyChart.length === 0 ? (
          <p className="text-xs text-muted">در حال بارگذاری...</p>
        ) : (
          (() => {
            const max = Math.max(...monthlyChart.map((m) => m.total), 1);
            return (
              <div className="flex items-end gap-1 h-32" dir="ltr">
                {monthlyChart.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}
                      title={`${m.label}: ${m.total.toLocaleString("fa-IR")} تومان (تعمیر ${m.repair.toLocaleString("fa-IR")} · فروش ${m.sale.toLocaleString("fa-IR")})`}>
                      <div className="w-full rounded-t-sm bg-teal/80" style={{ height: `${(m.sale / max) * 100}px` }} />
                      <div className={`w-full bg-copper/80 ${m.sale === 0 ? "rounded-t-sm" : ""}`} style={{ height: `${(m.repair / max) * 100}px` }} />
                    </div>
                    <div className="text-[8px] text-muted whitespace-nowrap">{m.label}</div>
                  </div>
                ))}
              </div>
            );
          })()
        )}

        <div className="border-t border-surface2 mt-4 pt-3">
          <div className="text-xs font-bold mb-2">📥 خروجی اکسل (CSV)</div>
          <div className="flex gap-2 flex-wrap">
            <a href="/api/reports/export?type=invoices" className="bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors text-xs font-semibold rounded-lg px-3 py-2">فاکتورها</a>
            <a href="/api/reports/export?type=tickets" className="bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors text-xs font-semibold rounded-lg px-3 py-2">تیکت‌های تعمیر</a>
            <a href="/api/reports/export?type=inventory" className="bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors text-xs font-semibold rounded-lg px-3 py-2">انبار</a>
          </div>
          <p className="text-[10px] text-muted mt-2">فایل CSV با پشتیبانی فارسی — مستقیم در Excel یا Google Sheets باز می‌شود.</p>
        </div>
      </Section>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-4 flex items-center justify-between">
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
      <Section title="اطلاعات مغازه" icon="🏪">
        <label className="block text-xs text-muted mb-2">نوع فعالیت مغازه</label>
        <div className="flex bg-surface2 rounded-lg p-1 mb-4">
          {[
            ["REPAIR", "فقط تعمیرگاه"],
            ["DEALER", "فقط خرید و فروش"],
            ["BOTH", "هر دو"],
          ].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setShopInfo({ ...shopInfo, type: val })}
              className={`flex-1 text-[11px] font-bold rounded-md py-2 transition ${shopInfo.type === val ? "bg-copper text-[#1A1410]" : "text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
        {(shopInfo.type === "DEALER" || shopInfo.type === "BOTH") && (
          <p className="text-[10px] text-teal mb-3">✅ بخش «خرید و فروش» حالا در نوار بالا فعال است.</p>
        )}

        <label className="block text-xs text-muted mb-1">نام مغازه</label>
        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={shopInfo.name} onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })} />
        <label className="block text-xs text-muted mb-1">استان</label>
        <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3"
          value={shopInfo.province ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, province: e.target.value })}>
          <option value="">انتخاب استان (برای رتبه‌بندی سراسری)</option>
          {PROVINCE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
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

        <label className="block text-xs text-muted mb-1">درصد مالیات بر خدمات (پیش‌فرض ۱۰٪)</label>
        <input type="number" step="0.5" min="0" max="100" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mb-3 mono"
          value={shopInfo.taxPercent ?? 10} onChange={(e) => setShopInfo({ ...shopInfo, taxPercent: +e.target.value })} />

        <label className="block text-xs text-muted mb-1">موقعیت مکانی مغازه</label>
        {neshanApiKey ? (
          <div className="mb-2">
            <LocationPicker
              apiKey={neshanApiKey}
              latitude={shopInfo.latitude ?? null}
              longitude={shopInfo.longitude ?? null}
              onChange={(lat, lng) => setShopInfo({ ...shopInfo, latitude: lat, longitude: lng })}
            />
            <p className="text-[10px] text-muted mt-1">روی نقشه کلیک کنید یا پین را بکشید تا موقعیت دقیق مغازه ثبت شود.</p>
          </div>
        ) : (
          <p className="text-[10px] text-amber mb-2">نقشه تعاملی فعال نیست — مدیر پلتفرم باید کلید نقشه نشان را در تنظیمات ثبت کند.</p>
        )}
        <div className="flex gap-2 mb-1">
          <input type="number" step="any" placeholder="عرض جغرافیایی (Latitude)" className="flex-1 bg-surface2 rounded-lg px-3 py-2 text-sm mono"
            value={shopInfo.latitude ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, latitude: e.target.value ? +e.target.value : null })} />
          <input type="number" step="any" placeholder="طول جغرافیایی (Longitude)" className="flex-1 bg-surface2 rounded-lg px-3 py-2 text-sm mono"
            value={shopInfo.longitude ?? ""} onChange={(e) => setShopInfo({ ...shopInfo, longitude: e.target.value ? +e.target.value : null })} />
        </div>
        <p className="text-[10px] text-muted mb-3">
          {shopInfo.latitude && shopInfo.longitude && (
            <a className="text-copper" target="_blank" href={`https://maps.google.com/?q=${shopInfo.latitude},${shopInfo.longitude}`}>مشاهده روی گوگل‌مپ</a>
          )}
        </p>

        {shopSaveError && <p className="text-danger text-xs mb-2">{shopSaveError}</p>}
        <button onClick={saveShopInfo} className="w-full bg-surface2 hover:bg-copper hover:text-[#1A1410] transition-colors font-bold rounded-lg py-2.5 text-sm">
          {shopSaved ? "✅ ذخیره شد" : "ذخیره تغییرات"}
        </button>
      </Section>

      {/* QR self-intake */}
      {shopInfo.id && (
        <Section title="کد QR پذیرش مشتری" icon="🔳">
          <div className="text-center">
          <p className="text-[11px] text-muted mb-3">این کد را چاپ کرده و در مغازه نصب کنید؛ مشتری با اسکن آن می‌تواند مشخصات دستگاه خود را ثبت کند.</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/kiosk/${shopInfo.id}`)}`}
            alt="QR کد پذیرش"
            className="mx-auto rounded-lg bg-white p-2"
          />
          <p className="text-[10px] text-muted mt-2 mono break-all">/kiosk/{shopInfo.id}</p>
          </div>
        </Section>
      )}

      {shopInfo.id && (
        <Section title="صفحه عمومی مغازه" icon="🔗">
          <p className="text-[11px] text-muted mb-2">این لینک را با مشتریان به اشتراک بگذارید — آدرس، تماس، امتیاز و مسیریابی مغازه را نشان می‌دهد.</p>
          <a href={`/shop/${shopInfo.id}`} target="_blank" className="text-copper text-xs mono break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/shop/{shopInfo.id}
          </a>
        </Section>
      )}

      {/* Favorite brands */}
      <Section title="برندهای پرکاربرد" icon="⭐">
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
      </Section>

      {/* Issue templates */}
      <Section title="الگوهای شرح ایراد" icon="📝">
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
      </Section>

      <Section title="تیم و کارکنان" icon="👥">
        <div className="text-xs font-bold mb-2">افزودن کارمند جدید</div>
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

        <div className="text-xs font-bold mb-2 mt-5">اعضای تیم</div>
        <div className="space-y-2">
          {staff.map((s) => (
            <StaffRow key={s.id} staff={s} onSaved={load} />
          ))}
        </div>
      </Section>

      <Section title="گزارش بهره‌وری" icon="📊">
        <p className="text-[11px] text-muted mb-2">دستگاه‌های تحویل‌شده توسط هر تعمیرکار</p>
        <div className="space-y-2">
          {report.map((r) => (
            <div key={r.techId} className="flex justify-between bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs">
              <span>{r.name} · {ROLE_LABEL[r.role] ?? r.role}</span>
              <span className="mono">{r.closedCount} دستگاه · {r.revenue.toLocaleString("fa-IR")} تومان</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="گزارش حقوق و دستمزد" icon="💵">
        <PayrollReport />
      </Section>
    </div>
  );
}

/* Collapsible admin section — same accordion pattern as the ticket lanes:
   tap the header to open/close, chevron shows state. */
function Section({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-surface border border-surface2 rounded-xl mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-right"
      >
        <span className="text-sm font-bold">{icon} {title}</span>
        <span className={`text-muted text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function PayrollReport() {
  const [rows, setRows] = useState<{ techId: string; name: string; role: string; totalWage: number; ticketCount: number }[]>([]);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports/payroll?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotalPayroll(data.totalPayroll ?? 0);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <p className="text-[11px] text-muted mb-3">مجموع دستمزد ثبت‌شده هر تعمیرکار در فاکتورهای این بازه (پیش‌فرض: ماه جاری)</p>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] text-muted mb-1">از تاریخ</label>
          <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs" value={from} onChange={setFrom} />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-muted mb-1">تا تاریخ</label>
          <JalaliDatePicker className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs" value={to} onChange={setTo} />
        </div>
        <button onClick={load} className="self-end bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3 py-1.5">اعمال</button>
      </div>
      <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-3 mb-3">
        <div className="text-[11px] text-muted mb-0.5">مجموع کل حقوق این بازه</div>
        <div className="text-lg font-extrabold mono text-copper">{totalPayroll.toLocaleString("fa-IR")} <span className="text-xs font-normal text-ink">تومان</span></div>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-muted">دستمزدی در این بازه ثبت نشده.</p>}
        {rows.map((r) => (
          <div key={r.techId} className="flex justify-between bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-xs">
            <span>{r.name} · {ROLE_LABEL[r.role] ?? r.role}</span>
            <span className="mono">{r.ticketCount} فاکتور · {r.totalWage.toLocaleString("fa-IR")} تومان</span>
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
