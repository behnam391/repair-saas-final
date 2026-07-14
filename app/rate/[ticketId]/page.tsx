"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RatePage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const [info, setInfo] = useState<{ shopName: string; techName: string | null; deviceModel: string } | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/rate/${ticketId}`).then((r) => {
      if (!r.ok) { setNotFound(true); return null; }
      return r.json();
    }).then((d) => {
      if (!d) return;
      setInfo({ shopName: d.ticket.shop.name, techName: d.ticket.assignedTo?.name ?? null, deviceModel: d.ticket.deviceModel });
      setAlreadyRated(d.alreadyRated);
    });
  }, [ticketId]);

  async function submit() {
    if (stars === 0) return;
    const res = await fetch(`/api/rate/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, comment: comment || undefined }),
    });
    if (res.ok) setSubmitted(true);
  }

  if (notFound) return <div className="min-h-screen flex items-center justify-center text-sm text-muted">این تیکت یافت نشد.</div>;
  if (!info) return null;

  if (alreadyRated || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-3xl mb-3">🙏</div>
          <p className="text-sm">از نظر شما درباره «{info.shopName}» متشکریم.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border-t-2 border-t-copper border-x border-b border-surface2 rounded-2xl p-6 text-center">
        <h1 className="display-heading text-lg mb-1">{info.shopName}</h1>
        <p className="text-xs text-muted mb-5">تعمیر {info.deviceModel} {info.techName && `توسط ${info.techName}`} چطور بود؟</p>

        <div className="flex justify-center gap-1 mb-5" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} className="text-3xl">
              {n <= stars ? "★" : "☆"}
            </button>
          ))}
        </div>

        <textarea className="w-full bg-surface2 border border-surface2 rounded-lg px-3 py-2 text-sm mb-4"
          placeholder="نظر شما (اختیاری)" value={comment} onChange={(e) => setComment(e.target.value)} />

        <button onClick={submit} disabled={stars === 0} className="w-full bg-copper text-[#1A1410] font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
          ثبت امتیاز
        </button>
      </div>
    </div>
  );
}
