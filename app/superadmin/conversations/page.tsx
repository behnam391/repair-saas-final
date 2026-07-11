"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Convo = {
  id: string; listing: { title: string; author: { name: string; phone: string } };
  starter: { name: string; phone: string };
  messages: { content: string; createdAt: string }[];
};
type Msg = { id: string; content: string; createdAt: string; sender: { name: string } };

export default function SuperAdminConversationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    if (status === "authenticated" && !(session?.user as any)?.isSuperAdmin) router.push("/superadmin/login");
  }, [status, session]);

  useEffect(() => {
    fetch("/api/superadmin/conversations").then((r) => r.json()).then((d) => setConversations(d.conversations ?? []));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    fetch(`/api/conversations/${activeId}/messages`).then((r) => r.json()).then((d) => setMessages(d.messages ?? []));
  }, [activeId]);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <a href="/superadmin" className="text-xs text-copper">← بازگشت</a>
      <h1 className="font-extrabold text-lg mt-2 mb-1">نظارت بر چت‌های بازار سراسری</h1>
      <p className="text-[11px] text-muted mb-4">این لیست فقط برای نظارت و رسیدگی به گزارش‌هاست.</p>

      <div className="flex gap-3">
        <div className="w-1/2 space-y-1.5 max-h-[70vh] overflow-y-auto">
          {conversations.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-right p-2.5 rounded-lg text-xs ${activeId === c.id ? "bg-surface2" : "bg-surface"}`}>
              <div className="font-bold">{c.listing.title}</div>
              <div className="text-muted mt-0.5">{c.starter.name} ↔ {c.listing.author.name}</div>
            </button>
          ))}
        </div>
        <div className="w-1/2 space-y-1.5 max-h-[70vh] overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className="bg-surface2 rounded-lg p-2 text-xs">
              <span className="font-semibold">{m.sender.name}:</span> {m.content}
            </div>
          ))}
          {!activeId && <p className="text-xs text-muted p-4">یک گفتگو را انتخاب کنید</p>}
        </div>
      </div>
    </div>
  );
}
