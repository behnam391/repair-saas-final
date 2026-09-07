"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { notificationLink } from "@/lib/notification-link";
type Notice = { id: string; title: string; message: string; read: boolean; link: string | null; createdAt: string };
export default function NotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try { const r = await fetch("/api/notifications"); if (!r.ok) throw Error(); setItems((await r.json()).notifications); }
    catch { setError("دریافت اعلان‌ها ممکن نشد؛ دوباره تلاش کنید."); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function read(ids: string[]) {
    try { const r = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }); if (!r.ok) throw Error(); setItems(old => old.map(n => ids.includes(n.id) ? { ...n, read: true } : n)); }
    catch { setError("ثبت وضعیت خوانده‌شدن انجام نشد."); }
  }
  const visible = items.filter(n => !unread || !n.read);
  return <main className="max-w-3xl mx-auto p-4 sm:p-6"><h1 className="text-xl font-bold">مرکز اعلان‌ها</h1><div className="flex flex-wrap gap-3 my-4"><button className="p-3 rounded-xl bg-surface2" onClick={() => setUnread(!unread)}>{unread ? "نمایش همه" : "فقط خوانده‌نشده‌ها"}</button><button className="p-3 rounded-xl bg-surface2" onClick={() => read(items.filter(n => !n.read).map(n => n.id))}>خواندن همه</button></div>{error && <p role="alert">{error}<button onClick={load}> تلاش دوباره</button></p>}{loading ? <p>در حال دریافت…</p> : !visible.length ? <p>اعلانی برای نمایش وجود ندارد.</p> : visible.map(n => <article key={n.id} className="border border-border bg-surface rounded-2xl p-4 mb-3 break-words"><h2 className="font-bold text-base">{!n.read && "● "}{n.title}</h2><p className="whitespace-pre-wrap text-sm leading-8 my-3 [overflow-wrap:anywhere]">{n.message}</p><time className="text-xs text-muted">{new Date(n.createdAt).toLocaleString("fa-IR")}</time><div className="flex gap-4 mt-3">{!n.read && <button onClick={() => read([n.id])} className="text-copper py-2">خواندم</button>}{notificationLink(n.link) && <Link className="text-copper py-2" href={notificationLink(n.link)!} onClick={() => { if (!n.read) read([n.id]); }}>باز کردن پیوند</Link>}</div></article>)}</main>;
}
