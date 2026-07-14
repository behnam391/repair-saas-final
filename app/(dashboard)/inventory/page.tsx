"use client";
import { useEffect, useState } from "react";

type Item = {
  id: string; name: string; quantity: number; lowStock: boolean; costPrice: number; sellPrice: number;
  condition: string; frequentlyUsed: boolean;
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: "", quantity: 0, lowStockAt: 2, costPrice: 0, sellPrice: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  async function load() {
    const res = await fetch("/api/inventory");
    const data = await res.json();
    setItems(data.items ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", quantity: 0, lowStockAt: 2, costPrice: 0, sellPrice: 0 });
    load();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditForm({ name: item.name, quantity: item.quantity, costPrice: item.costPrice, sellPrice: item.sellPrice, condition: item.condition, frequentlyUsed: item.frequentlyUsed });
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
    if (!confirm("حذف این قطعه از انبار؟")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">انبار قطعات</h1>

      <div className="bg-surface border border-surface2 rounded-xl p-3 mb-4 flex flex-wrap gap-2">
        <input placeholder="نام قطعه" className="bg-surface2 rounded-lg px-2 py-1.5 text-xs flex-1 min-w-[120px]"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="موجودی" type="number" className="bg-surface2 rounded-lg px-2 py-1.5 text-xs w-20"
          value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
        <input placeholder="قیمت خرید" type="number" className="bg-surface2 rounded-lg px-2 py-1.5 text-xs w-24"
          value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
        <input placeholder="قیمت فروش" type="number" className="bg-surface2 rounded-lg px-2 py-1.5 text-xs w-24"
          value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} />
        <button onClick={add} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3">افزودن</button>
      </div>

      <div className="space-y-2">
        {items.map((i) => (
          editingId === i.id ? (
            <div key={i.id} className="bg-surface2 border border-copper rounded-lg p-3 text-xs space-y-2">
              <input className="w-full bg-surface rounded-lg px-2 py-1.5" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <div className="flex gap-2">
                <input type="number" placeholder="موجودی" className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: +e.target.value })} />
                <input type="number" placeholder="قیمت خرید" className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: +e.target.value })} />
                <input type="number" placeholder="قیمت فروش" className="flex-1 bg-surface rounded-lg px-2 py-1.5" value={editForm.sellPrice} onChange={(e) => setEditForm({ ...editForm, sellPrice: +e.target.value })} />
              </div>
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
            <div key={i.id} className={`flex justify-between items-center bg-surface2 border rounded-lg px-3 py-2 text-xs ${i.lowStock ? "border-danger" : "border-surface2"}`}>
              <span>{i.name} {i.condition === "DEFECTIVE" && <span className="text-danger">(معیوب)</span>} {i.frequentlyUsed && "⭐"}</span>
              <div className="flex items-center gap-2">
                <span className="mono">{i.quantity} عدد {i.lowStock && "· موجودی کم"}</span>
                <button onClick={() => startEdit(i)} className="text-copper text-[10px] font-semibold">ویرایش</button>
                <button onClick={() => remove(i.id)} className="text-danger text-[10px] font-semibold">حذف</button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
