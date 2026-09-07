"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
export default function NotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    async function load() { try { const r = await fetch("/api/notifications"); if (r.ok) { const d = await r.json(); if (alive) setCount(d.unreadCount ?? 0); } } catch {} }
    load(); const timer = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return <Link href="/notifications" className="app-icon-button relative" aria-label={`اعلان‌ها، ${count} خوانده‌نشده`}><Bell size={20} />{count > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-danger text-white text-xs px-1.5">{count > 99 ? "99+" : count}</span>}</Link>;
}
