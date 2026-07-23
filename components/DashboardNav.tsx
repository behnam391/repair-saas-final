"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string; external?: boolean };
type NavGroup = { label: string; items: NavItem[] };

export default function DashboardNav({ role, guideUrl, shopType }: { role: string; guideUrl: string | null; shopType?: string }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideMenu = (e.target as HTMLElement)?.closest?.("[data-nav-menu]");
      if (!insideContainer && !insideMenu) setOpenGroup(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleGroup(label: string) {
    if (openGroup === label) { setOpenGroup(null); return; }
    const btn = btnRefs.current[label];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpenGroup(label);
  }

  const groups: NavGroup[] = [
    {
      label: "عملیات",
      items: [
        { href: "/inventory", label: "انبار قطعات" },
        { href: "/sales", label: "فروش مستقیم" },
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

  const activeGroup = groups.find((g) => g.label === openGroup);

  return (
    <>
      {/* Mobile: full-width swipeable strip on its own line (order-last drops it
          below the identity/actions row). Desktop: centered, wrapping, in-row. */}
      <div
        ref={containerRef}
        className="flex items-center gap-1 w-full order-last overflow-x-auto no-scrollbar pt-1 -mb-1
                   md:w-auto md:order-none md:flex-1 md:justify-center md:flex-wrap md:overflow-visible md:pt-0 md:mb-0"
      >
        <Link href="/tickets" className="bg-copper/15 text-copper font-bold rounded-full px-3 py-1 whitespace-nowrap text-xs">
          🏠 صفحه اصلی
        </Link>
        {(shopType === "DEALER" || shopType === "BOTH") && (
          <Link href="/dealer" className="bg-teal/15 text-teal font-bold rounded-full px-3 py-1 whitespace-nowrap text-xs">
            💰 خرید و فروش
          </Link>
        )}

        {groups.map((g) => (
          <button
            key={g.label}
            ref={(el) => { btnRefs.current[g.label] = el; }}
            onClick={() => toggleGroup(g.label)}
            className={`text-xs font-bold rounded-lg px-2.5 py-1.5 whitespace-nowrap transition border-b-2 ${
              openGroup === g.label ? "bg-surface2 text-ink border-copper" : "text-ink hover:bg-surface2 border-transparent"
            }`}
          >
            {g.label} ▾
          </button>
        ))}
      </div>

      {/* Rendered with fixed positioning at the viewport level so it's
          never clipped by the sticky header's stacking/overflow context. */}
      {activeGroup && menuPos && (
        <div
          data-nav-menu
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
          className="bg-surface border border-surface2 rounded-xl shadow-lg py-1.5 min-w-[170px] z-[200]"
        >
          {activeGroup.items.map((item) =>
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
    </>
  );
}
