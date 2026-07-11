"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Ticket = {
  id: string; subject: string; message: string; status: string; createdAt: string;
  shop: { name: string }; user: { name: string; phone: string };
  replies: { id: string; message: string; fromPlatform: boolean; createdAt: string }[];
};

export default function SuperAdminSupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  async function load() {
    const res = await fetch("/api/superadmin/support");
    if (res.ok) setTickets((await res.json()).tickets ?? []);
  }
  useEffect(() => { load(); }, []);

  async function reply(id: string) {
    const message = replyDraft[id]?.trim();
    if (!message) return;
    await fetch(`/api/support/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setReplyDraft({ ...replyDraft, [id]: "" });
    load();
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-4">تیکت‌های پشتیبانی</h1>
      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="bg-surface2 border border-surface2 rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">{t.subject}</span>
              <span className={t.status === "OPEN" ? "text-amber" : "text-teal"}>{t.status === "OPEN" ? "باز" : "بسته"}</span>
            </div>
            <div className="text-muted mt-1">{t.shop.name} · {t.user.name} ({t.user.phone})</div>
            <div className="mt-1.5">{t.message}</div>
            {t.replies.map((r) => (
              <div key={r.id} className={`mt-2 rounded-lg px-2.5 py-1.5 ${r.fromPlatform ? "bg-teal/10 text-teal" : "bg-surface"}`}>
                {r.fromPlatform ? "پشتیبانی: " : "مغازه: "}{r.message}
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input className="flex-1 bg-surface rounded-lg px-2 py-1.5 text-xs" placeholder="پاسخ به‌عنوان پشتیبانی..."
                value={replyDraft[t.id] || ""} onChange={(e) => setReplyDraft({ ...replyDraft, [t.id]: e.target.value })} />
              <button onClick={() => reply(t.id)} className="bg-copper text-[#1A1410] text-xs font-bold rounded-lg px-3">ارسال</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
