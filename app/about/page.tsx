"use client";
import { useEffect, useState } from "react";

export default function AboutPage() {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform-info").then((r) => r.json()).then((d) => setContent(d.aboutUsContent));
  }, []);

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto">
      <h1 className="display-heading text-lg mb-4">درباره ما</h1>
      {content ? (
        <p className="text-sm whitespace-pre-line leading-7">{content}</p>
      ) : (
        <p className="text-xs text-muted">محتوایی هنوز ثبت نشده است.</p>
      )}
    </div>
  );
}
