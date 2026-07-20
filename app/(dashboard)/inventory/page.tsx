"use client";
import { useEffect, useMemo, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

const CATEGORY_LABEL: Record<string, string> = {
  PART: "🔩 قطعه", ACCESSORY: "🎧 لوازم جانبی", PHONE: "📱 گوشی / دستگاه", TOOL: "🛠 ابزار تعمیر", OTHER: "📦 سایر",
};

type Item = {
  id: string; name: string; sku: string | null; category: string; deviceModel: string | null;
  description: string | null; imageUrl: string | null;
  quantity: number; lowStock: boolean; lowStockAt: number; costPrice: number; sellPrice: number;
  condition: string; frequentlyUsed: boolean;
};

const EMPTY_FORM = {
  name: "", category: "PART", deviceModel: "", description: "", imageUrl: "",
  quantity: 0, lowStockAt: 2, costPrice: 0, sellPrice: 0,
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  async function load() {
    const res = await fetch("/api/inventory");
    const data = await res.json();
    setItems(data.items ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.name.trim()) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...EMPTY_FORM, category: form.category });
    setShowAdd(false);
    load();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditForm({
      name: item.name, category: item.category, deviceModel: item.deviceModel ?? "",
      description: item.description ?? "", imageUrl: item.imageUrl ?? "",
      quantity: item.quantity, lowStockAt: item.lowStockAt, costPrice: item.costPrice, sellPrice: item.sellPrice,
      condition: item.condition, frequentlyUsed: item.frequentlyUsed,
    });
  }

  async function saveEdit(id: string) {
    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف این قلم از انبار؟")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = useMemo(() => items.filter((i) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      i.name.toLowerCase().includes(q) ||
      (i.deviceModel ?? "").toLowerCase().includes(q) ||
      (i.description ?? "").toLowerCase().includes(q);
    const matchesCat = !catFilter || i.category === catFilter;
    return matchesSearch && matchesCat;
  }), [items, search, catFilter]);

  const totalValue = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const lowCount = items.filter((i) => i.lowStock).length;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-1">
        <h1 className="display-heading text-lg">انبار مغازه</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3 py-2">
          {showAdd ? "بستن فرم" : "+ افزودن کالا"}
        </button>
      </div>
      <p className="text-[11px] text-muted mb-4">
        هر چیز مربوط به موبایل — قطعه، لوازم جانبی، گوشی، ابزار یا جنس اضافه — را اینجا ثبت کنید. اگر کسی در بازار سراسری دنبال کالای مشابه موجودی شما بگردد، به شما اعلان می‌رسد.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-3">
          <div className="text-[11px] text-muted mb-0.5">ارزش کل انبار (قیمت خرید)</div>
          <div className="text-base font-extrabold mono">{totalValue.toLocaleString("fa-IR")} <span className="text-[10px] font-normal">تومان</span></div>
        </div>
        <div className="bg-gradient-to-br from-surface to-surface2 border border-surface2 rounded-xl p-3">
          <div className="text-[11px] text-muted mb-0.5">اقلام رو به اتمام</div>
          <div className={`text-base font-extrabold mono ${lowCount ? "text-danger" : "text-teal"}`}>{lowCount}</div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-surface border border-copper/40 rounded-xl p-4 mb-4 space-y-2">
          <div className="text-sm font-bold mb-1">ثبت کالای جدید</div>
          <div className="flex gap-2">
            <input placeholder="نام کالا (مثلاً LCD سامسونگ A54 یا گلس A34)" className="flex-1 bg-surface2 rounded-lg px-3 py-2 text-sm"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="bg-surface2 rounded-lg px-2 py-2 text-xs" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <input placeholder="مدل دستگاه سازگار (اختیاری — مثلاً Samsung A54)" className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm"
            value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} />
          <textarea placeholder="توضیحات (اختیاری — گرید، رنگ، تأمین‌کننده، جنس اضافه...)" rows={2}
            className="w-full bg-surface2 rounded-lg px-3 py-2 text-xs"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-0.5">موجودی</label>
              <input type="number" className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs"
                value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-0.5">هشدار اتمام در</label>
              <input type="number" className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs"
                value={form.lowStockAt} onChange={(e) => setForm({ ...form, lowStockAt: +e.target.value })} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-0.5">قیمت خرید</label>
              <input type="number" className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs"
                value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-0.5">قیمت فروش</label>
              <input type="number" className="w-full bg-surface2 rounded-lg px-2 py-1.5 text-xs"
                value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} />
            </div>
          </div>
          <ImageUploader label="عکس کالا (اختیاری)" value={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })} showUrlInput={false} />
          <button onClick={add} className="w-full bg-copper text-[#1A1410] text-sm font-bold rounded-lg py-2.5">ثبت در انبار</button>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input className="flex-1 bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm"
          placeholder="جستجو در نام، مدل یا توضیحات..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="bg-surface2 border border-surface2 rounded-lg px-2 text-xs" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">همه دسته‌ها</option>
          {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-muted text-center py-8">موردی پیدا نشد.</p>}
        {filtered.map((i) => (
          editingId === i.id ? (
            <div key={i.id} className="bg-surface2 border border-copper rounded-lg p-3 text-xs space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <select className="bg-surface rounded-lg px-2 py-1.5" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                  {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <input className="w-full bg-surface rounded-lg px-2 py-1.5" placeholder="مدل دستگاه سازگار"
                value={editForm.deviceModel} onChange={(e) => setEditForm({ ...editForm, deviceModel: e.target.value })} />
              <textarea className="w-full bg-surface rounded-lg px-2 py-1.5" rows={2} placeholder="توضیحات"
                value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <div className="flex gap-2">
                <input type="number" placeholder="موجودی" className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: +e.target.value })} />
                <input type="number" placeholder="هشدار اتمام" className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.lowStockAt} onChange={(e) => setEditForm({ ...editForm, lowStockAt: +e.target.value })} />
                <input type="number" placeholder="قیمت خرید" className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: +e.target.value })} />
                <input type="number" placeholder="قیمت فروش" className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.sellPrice} onChange={(e) => setEditForm({ ...editForm, sellPrice: +e.target.value })} />
              </div>
              <ImageUploader label="عکس کالا" value={editForm.imageUrl}
                onChange={(url) => setEditForm({ ...editForm, imageUrl: url })} showUrlInput={false} />
              <div className="flex gap-3 items-center">
                <select className="bg-surface rounded-lg px-2 py-1.5" value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}>
                  <option value="WORKING">سالم</option>
                  <option value="DEFECTIVE">معیوب</option>
                </select>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={editForm.frequentlyUsed} onChange={(e) => setEditForm({ ...editForm, frequentlyUsed: e.target.checked })} />
                  پرکاربرد
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveEdit(i.id)} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-1.5">ذخیره</button>
                <button onClick={() => setEditingId(null)} className="flex-1 bg-surface rounded-lg py-1.5">انصراف</button>
              </div>
            </div>
          ) : (
            <div key={i.id} className={`bg-surface2 border rounded-lg px-3 py-2.5 text-xs ${i.lowStock ? "border-danger" : "border-surface2"}`}>
              <div className="flex items-center gap-2.5">
                {i.imageUrl && (
                  <a href={i.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover border border-surface" />
                  </a>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">
                    {i.name}
                    {i.condition === "DEFECTIVE" && <span className="text-danger font-normal"> (معیوب)</span>}
                    {i.frequentlyUsed && " ⭐"}
                  </div>
                  <div className="text-muted mt-0.5 flex flex-wrap gap-x-2">
                    <span>{CATEGORY_LABEL[i.category] ?? i.category}</span>
                    {i.deviceModel && <span>· {i.deviceModel}</span>}
                    <span>· فروش: {i.sellPrice.toLocaleString("fa-IR")}</span>
                  </div>
                  {i.description && <div className="text-muted text-[10px] mt-0.5 truncate">{i.description}</div>}
                </div>
                <div className="text-left shrink-0">
                  <div className="mono font-bold">{i.quantity} عدد</div>
                  {i.lowStock && <div className="text-danger text-[10px]">موجودی کم</div>}
                  <div className="flex gap-2 mt-1 justify-end">
                    <button onClick={() => startEdit(i)} className="text-copper text-[10px] font-semibold">ویرایش</button>
                    <button onClick={() => remove(i.id)} className="text-danger text-[10px] font-semibold">حذف</button>
                  </div>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
