"use client";
import { useEffect, useState } from "react";

type Item = { id: string; name: string; quantity: number; lowStock: boolean; costPrice: number; sellPrice: number };

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: "", quantity: 0, lowStockAt: 2, costPrice: 0, sellPrice: 0 });

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
          <div key={i.id} className={`flex justify-between items-center bg-surface2 border rounded-lg px-3 py-2 text-xs ${i.lowStock ? "border-danger" : "border-surface2"}`}>
            <span>{i.name}</span>
            <span className="mono">{i.quantity} عدد {i.lowStock && "· موجودی کم"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
