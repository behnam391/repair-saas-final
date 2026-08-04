"use client";
import { num } from "@/lib/num";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ComboBox from "@/components/ComboBox";

const CONDITION_LABEL: Record<string, string> = { WORKING: "سالم", DEFECTIVE: "معیوب", FOR_PARTS: "برای قطعات" };

type Item = {
  id: string; imei: string | null; deviceModel: string; imageUrl: string | null; condition: string; purchasePrice: number; askingPrice: number | null;
  sourceName: string | null; status: string; soldPrice: number | null; buyerName: string | null; acquiredAt: string; soldAt: string | null;
};

export default function DealerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<"IN_STOCK" | "SOLD">("IN_STOCK");
  const [notDealer, setNotDealer] = useState(false);
  const [form, setForm] = useState({ imei: "", deviceModel: "", imageUrl: "", condition: "WORKING", purchasePrice: 0, askingPrice: 0, sourceName: "", sourcePhone: "" });
  const [sellId, setSellId] = useState<string | null>(null);
  const [sellForm, setSellForm] = useState({ soldPrice: 0, buyerName: "", buyerPhone: "" });
  const [error, setError] = useState("");

  // Brand/model catalog for the searchable ComboBox, same as the intake form.
  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const brandList = [...favoriteBrands, ...Object.keys(catalog).filter((b) => !favoriteBrands.includes(b))];
  const modelsForBrand = brand ? catalog[brand] ?? [] : [];

  async function load() {
    const res = await fetch("/api/dealer/inventory");
    if (res.status === 403) { setNotDealer(true); return; }
    if (res.ok) setItems((await res.json()).items ?? []);
  }
  useEffect(() => {
    load();
    fetch("/api/device-catalog").then((r) => r.json()).then((d) => {
      setCatalog(d.catalog ?? {});
      setFavoriteBrands(d.favoriteBrands ?? []);
    }).catch(() => {});
  }, []);

  async function addItem() {
    setError("");
    if (!form.deviceModel || !form.purchasePrice) return;
    const res = await fetch("/api/dealer/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, askingPrice: form.askingPrice || undefined }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.message || "ثبت ناموفق بود");
      return;
    }
    setForm({ imei: "", deviceModel: "", imageUrl: "", condition: "WORKING", purchasePrice: 0, askingPrice: 0, sourceName: "", sourcePhone: "" });
    setBrand("");
    load();
  }

  async function sell(id: string) {
    if (!sellForm.buyerName || !sellForm.soldPrice) return;
    await fetch(`/api/dealer/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sellForm),
    });
    setSellId(null);
    setSellForm({ soldPrice: 0, buyerName: "", buyerPhone: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("این قلم حذف شود؟")) return;
    await fetch(`/api/dealer/inventory/${id}`, { method: "DELETE" });
    load();
  }

  if (notDealer) {
    return (
      <div className="p-4 max-w-xl mx-auto text-center py-16">
        <p className="text-sm text-muted mb-3">این بخش فقط برای مغازه‌های با نوع «فروشنده» یا «هردو» فعال است.</p>
        <a href="/admin" className="text-copper text-xs font-semibold">رفتن به تنظیمات مغازه ←</a>
      </div>
    );
  }

  const filtered = items.filter((i) => i.status === tab);
  const totalProfit = items
    .filter((i) => i.status === "SOLD" && i.soldPrice)
    .reduce((sum, i) => sum + ((i.soldPrice ?? 0) - i.purchasePrice), 0);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-1">داشبورد فروشنده</h1>
      <p className="text-[11px] text-muted mb-4">مدیریت خرید و فروش گوشی، جدا از تیکت‌های تعمیر</p>

      <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-4 mb-5">
        <div className="text-xs text-muted mb-1">سود کل از فروش‌های ثبت‌شده</div>
        <div className="text-xl font-extrabold mono text-teal">{totalProfit.toLocaleString("fa-IR")} <span className="text-xs font-normal text-ink">تومان</span></div>
      </div>

      <div className="bg-surface border border-surface2 rounded-xl p-4 mb-5 space-y-2">
        <div className="text-sm font-bold mb-1">افزودن گوشی به موجودی</div>

        <label className="block text-xs text-muted mb-1">برند</label>
        <ComboBox
          value={brand}
          onChange={(v) => { setBrand(v); setForm({ ...form, deviceModel: "" }); }}
          options={brandList}
          starred={favoriteBrands}
          placeholder="انتخاب یا تایپ برند..."
        />

        {brand && (
          <div>
            <label className="block text-xs text-muted mb-1 mt-1">مدل</label>
            <ComboBox
              value={form.deviceModel.startsWith(`${brand} `) ? form.deviceModel.slice(brand.length + 1) : form.deviceModel}
              onChange={(m) => setForm({ ...form, deviceModel: m ? `${brand} ${m}` : "" })}
              options={modelsForBrand}
              placeholder="انتخاب یا تایپ مدل..."
            />
          </div>
        )}

        <label className="block text-xs text-muted mb-1 mt-1">وضعیت دستگاه</label>
        <select className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
          {Object.entries(CONDITION_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>

        <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm mono" placeholder="IMEI (اختیاری)" inputMode="tel" dir="ltr"
          value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
        <div className="flex gap-2">
          <input type="text" inputMode="numeric" dir="ltr" className="flex-1 min-w-0 bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="قیمت خرید (تومان)"
            value={form.purchasePrice || ""} onChange={(e) => setForm({ ...form, purchasePrice: num(e.target.value) })} />
          <input type="text" inputMode="numeric" dir="ltr" className="flex-1 min-w-0 bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="قیمت فروش (تومان)"
            value={form.askingPrice || ""} onChange={(e) => setForm({ ...form, askingPrice: num(e.target.value) })} />
        </div>
        <div className="flex gap-2">
          <input className="flex-1 min-w-0 bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="نام فروشنده"
            value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
          <input className="flex-1 min-w-0 bg-surface2 rounded-lg px-3 py-2 text-sm mono" placeholder="شماره تماس" inputMode="tel" dir="ltr"
            value={form.sourcePhone} onChange={(e) => setForm({ ...form, sourcePhone: e.target.value })} />
        </div>
        <ImageUploader
          label="عکس گوشی (اختیاری)"
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
          showUrlInput={false}
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        <button onClick={addItem} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm">افزودن به موجودی</button>
      </div>

      <div className="flex bg-surface2 rounded-lg p-1 mb-4">
        <button onClick={() => setTab("IN_STOCK")} className={`flex-1 text-xs font-bold rounded-md py-2 transition ${tab === "IN_STOCK" ? "bg-copper text-[#1A1410]" : "text-muted"}`}>موجودی فعلی</button>
        <button onClick={() => setTab("SOLD")} className={`flex-1 text-xs font-bold rounded-md py-2 transition ${tab === "SOLD" ? "bg-copper text-[#1A1410]" : "text-muted"}`}>فروخته‌شده</button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-muted text-center py-8">موردی نیست.</p>}
        {filtered.map((i) => (
          <div key={i.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {i.imageUrl && (
                  <a href={i.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-surface" />
                  </a>
                )}
                <span className="font-bold">{i.deviceModel} <span className="text-muted font-normal">({CONDITION_LABEL[i.condition]})</span></span>
              </div>
              <span className="mono shrink-0">{i.purchasePrice.toLocaleString("fa-IR")} تومان</span>
            </div>
            {i.imei && <div className="text-muted mono mt-0.5">IMEI: {i.imei}</div>}
            {i.sourceName && <div className="text-muted mt-0.5">خریداری‌شده از: {i.sourceName}</div>}
            {i.status === "IN_STOCK" && i.askingPrice && <div className="text-teal mt-1">قیمت پیشنهادی: {i.askingPrice.toLocaleString("fa-IR")} تومان</div>}
            {i.status === "SOLD" && (
              <div className="text-teal mt-1">
                فروخته‌شده به {i.buyerName} — {i.soldPrice?.toLocaleString("fa-IR")} تومان
                {" "}(سود: {((i.soldPrice ?? 0) - i.purchasePrice).toLocaleString("fa-IR")})
              </div>
            )}

            {i.status === "IN_STOCK" && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => setSellId(sellId === i.id ? null : i.id)} className="text-teal text-[10px] font-semibold">ثبت فروش</button>
                <button onClick={() => remove(i.id)} className="text-danger text-[10px] font-semibold">حذف</button>
              </div>
            )}
            {sellId === i.id && (
              <div className="bg-surface rounded-lg p-2.5 mt-2 space-y-1.5">
                <input type="text" inputMode="numeric" dir="ltr" className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="قیمت فروش (تومان)"
                  value={sellForm.soldPrice || ""} onChange={(e) => setSellForm({ ...sellForm, soldPrice: num(e.target.value) })} />
                <input className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs" placeholder="نام خریدار"
                  value={sellForm.buyerName} onChange={(e) => setSellForm({ ...sellForm, buyerName: e.target.value })} />
                <input className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs mono" placeholder="شماره خریدار (اختیاری)" inputMode="tel" dir="ltr"
                  value={sellForm.buyerPhone} onChange={(e) => setSellForm({ ...sellForm, buyerPhone: e.target.value })} />
                <button onClick={() => sell(i.id)} className="w-full bg-teal text-[#0E211E] font-bold rounded-lg py-1.5 text-xs">ثبت فروش</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
