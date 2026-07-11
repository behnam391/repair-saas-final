"use client";
import { useEffect, useState } from "react";

type Cust = { id: string; name: string; phone: string; createdAt: string; _count: { tickets: number } };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Cust[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers ?? []));
  }, []);

  const filtered = customers.filter((c) => c.name.includes(search) || c.phone.includes(search));

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">مشتریان</h1>
      <input
        className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4"
        placeholder="جستجو با نام یا شماره..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-muted text-center py-8">مشتری‌ای پیدا نشد.</p>}
        {filtered.map((c) => (
          <div key={c.id} className="flex justify-between bg-surface2 border border-surface2 rounded-lg px-3 py-2.5 text-xs">
            <div>
              <div className="font-bold">{c.name}</div>
              <div className="text-muted mt-0.5">{c.phone}</div>
            </div>
            <div className="text-muted self-center mono">{c._count.tickets} تیکت</div>
          </div>
        ))}
      </div>
    </div>
  );
}
