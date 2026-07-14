"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string; external?: boolean };
type NavGroup = { label: string; items: NavItem[] };

export default function DashboardNav({ role, guideUrl }: { role: string; guideUrl: string | null }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenGroup(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const groups: NavGroup[] = [
    {
      label: "عملیات",
      items: [
        { href: "/inventory", label: "انبار قطعات" },
        { href: "/invoices", label: "فاکتورها" },
        { href: "/returns", label: "مرجوعی" },
        { href: "/pending-intakes", label: "پذیرش QR" },
      ],
    },
    {
      label: "ارتباطات",
      items: [
        { href: "/market", label: "بازار سراسری" },
        { href: "/chats", label: "چت‌ها" },
        { href: "/device-lookup", label: "پرونده گوشی" },
      ],
    },
    {
      label: "مشتریان",
      items: [
        { href: "/customers", label: "دفترچه مشتریان" },
        { href: "/history", label: "سابقه و جستجو" },
      ],
    },
    {
      label: "من",
      items: [
        { href: "/profile", label: "پروفایل من" },
        { href: "/support", label: "پشتیبانی" },
        ...(guideUrl ? [{ href: guideUrl, label: "راهنمای سایت", external: true }] : []),
        { href: "/about", label: "درباره ما" },
      ],
    },
    ...(role === "OWNER"
      ? [{
          label: "مدیریت",
          items: [
            { href: "/admin", label: "پنل مدیریت" },
            { href: "/admin/billing", label: "اشتراک و پرداخت" },
          ],
        }]
      : []),
  ];

  return (
    <div ref={ref} className="flex items-center gap-1 flex-1 justify-center overflow-x-auto no-scrollbar">
      <Link href="/tickets" className="bg-copper/15 text-copper font-bold rounded-full px-3 py-1 whitespace-nowrap text-xs">
        🏠 صفحه اصلی
      </Link>

      {groups.map((g) => (
        <div key={g.label} className="relative">
          <button
            onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
            className={`text-xs font-bold rounded-lg px-2.5 py-1.5 whitespace-nowrap transition ${
              openGroup === g.label ? "bg-surface2 text-ink" : "text-ink hover:bg-surface2"
            }`}
          >
            {g.label} ▾
          </button>
          {openGroup === g.label && (
            <div className="absolute top-full mt-1 right-0 bg-surface border border-surface2 rounded-xl shadow-lg py-1.5 min-w-[160px] z-50">
              {g.items.map((item) =>
                item.external ? (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer"
                    onClick={() => setOpenGroup(null)}
                    className="block px-3 py-2 text-xs text-muted hover:bg-surface2 hover:text-ink whitespace-nowrap">
                    {item.label} ↗
                  </a>
                ) : (
                  <Link key={item.href} href={item.href} onClick={() => setOpenGroup(null)}
                    className="block px-3 py-2 text-xs text-muted hover:bg-surface2 hover:text-ink whitespace-nowrap">
                    {item.label}
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
