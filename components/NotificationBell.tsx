"use client";
import { useEffect, useState } from "react";

type Notif = { id: string; title: string; message: string; link: string | null; read: boolean; createdAt: string; isBroadcast: boolean };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) markAllRead(); }}
        className="relative text-xs text-muted hover:text-ink transition-colors"
        aria-label="اعلان‌ها"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -left-2 bg-danger text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 bg-surface border border-surface2 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-surface2 text-xs font-bold">اعلان‌ها</div>
          {notifications.length === 0 && <p className="text-[11px] text-muted p-4 text-center">اعلانی وجود ندارد.</p>}
          {notifications.map((n) => (
            <a
              key={n.id}
              href={n.link || "#"}
              className={`block p-3 border-b border-surface2 text-xs hover:bg-surface2 transition ${!n.read ? "bg-copper/5" : ""}`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {n.isBroadcast && <span className="text-[9px] bg-copper/20 text-copper rounded-full px-1.5">عمومی</span>}
                {n.title}
              </div>
              <div className="text-muted mt-1">{n.message}</div>
              <div className="text-[10px] text-muted mt-1">{new Date(n.createdAt).toLocaleString("fa-IR")}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
