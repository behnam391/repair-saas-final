"use client";
import { useEffect, useState } from "react";

type Cust = { id: string; name: string; phone: string; createdAt: string; _count: { tickets: number } };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Cust[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cust | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [addError, setAddError] = useState("");

  async function load() {
    const res = await fetch("/api/customers");
    if (res.ok) setCustomers((await res.json()).customers ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addCustomer() {
    setAddError("");
    if (!newCustomer.name || !newCustomer.phone) return;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });
    if (!res.ok) {
      const err = await res.json();
      setAddError(err.message || "افزودن ناموفق بود");
      return;
    }
    setNewCustomer({ name: "", phone: "" });
    setShowAdd(false);
    load();
  }

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
      <div className="flex justify-between items-center mb-3">
        <h1 className="display-heading text-lg">مشتریان</h1>
        <button onClick={() => setShowAdd(true)} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3 py-1.5">+ افزودن مشتری</button>
      </div>
      {showAdd && (
        <div className="bg-surface border border-surface2 rounded-xl p-4 mb-4 space-y-2">
          <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="نام مشتری"
            value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
          <input className="w-full bg-surface2 rounded-lg px-3 py-2 text-sm" placeholder="شماره تماس"
            value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
          {addError && <p className="text-danger text-xs">{addError}</p>}
          <div className="flex gap-2">
            <button onClick={addCustomer} className="flex-1 bg-copper text-[#1A1410] font-bold rounded-lg py-2 text-sm">ثبت</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 bg-surface2 rounded-lg py-2 text-sm">انصراف</button>
          </div>
        </div>
      )}
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
