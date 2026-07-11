"use client";
import { useEffect, useState } from "react";

type Cust = { id: string; name: string; phone: string; createdAt: string; _count: { tickets: number } };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Cust[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cust | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/customers");
    if (res.ok) setCustomers((await res.json()).customers ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) => c.name.includes(search) || c.phone.includes(search));

  function startEdit(c: Cust) {
    setEditing(c);
    setEditForm({ name: c.name, phone: c.phone });
    setMsg("");
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch(`/api/customers/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      setMsg(err.message || "حذف ناموفق بود");
      return;
    }
    load();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">مشتریان</h1>
      <input
        className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-3"
        placeholder="جستجو با نام یا شماره..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {msg && <p className="text-danger text-xs mb-3">{msg}</p>}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-muted text-center py-8">مشتری‌ای پیدا نشد.</p>}
        {filtered.map((c) => (
          <div key={c.id} className="bg-surface2 border border-surface2 rounded-lg px-3 py-2.5 text-xs">
            {editing?.id === c.id ? (
              <div className="space-y-2">
                <input className="w-full bg-surface rounded-lg px-2 py-1.5 text-xs" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <input className="w-full bg-surface rounded-lg px-2 py-1.5 text-xs" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-1.5">ذخیره</button>
                  <button onClick={() => setEditing(null)} className="flex-1 bg-surface rounded-lg py-1.5">انصراف</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-muted mt-0.5">{c.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted mono">{c._count.tickets} تیکت</span>
                  <button onClick={() => startEdit(c)} className="text-copper">✏️</button>
                  <button onClick={() => remove(c.id)} className="text-danger">🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
