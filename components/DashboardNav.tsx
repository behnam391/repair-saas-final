"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

type NavItem = { href: string; label: string; external?: boolean };
type NavGroup = { label: string; icon: string; items: NavItem[] };

export default function DashboardNav({ role, guideUrl, shopType }: { role: string; guideUrl: string | null; shopType?: string }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Portal target only exists client-side; also, the sheet MUST be portaled
  // to <body>: the glass header's backdrop-filter turns the header into the
  // containing block for fixed-position descendants, which would trap and
  // clip a fixed overlay inside the header box.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
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

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

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
      icon: "🛠️",
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
      icon: "💬",
      items: [
        { href: "/market", label: "بازار سراسری" },
        { href: "/chats", label: "چت‌ها" },
        { href: "/device-lookup", label: "پرونده گوشی" },
      ],
    },
    {
      label: "مشتریان",
      icon: "👥",
      items: [
        { href: "/customers", label: "دفترچه مشتریان" },
        { href: "/history", label: "سابقه و جستجو" },
      ],
    },
    {
      label: "من",
      icon: "⚙️",
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
          icon: "📊",
          items: [
            { href: "/admin", label: "پنل مدیریت" },
            { href: "/admin/billing", label: "اشتراک و پرداخت" },
          ],
        }]
      : []),
  ];

  const activeGroup = groups.find((g) => g.label === openGroup);
  const showDealer = shopType === "DEALER" || shopType === "BOTH";

  return (
    <>
      {/* ── Mobile (below md): quick pills + one «منو» button that opens a
          full sheet with every category visible — no sideways swiping. */}
      <div className="flex md:hidden items-center gap-1.5 w-full order-last pt-1">
        <Link href="/tickets" className="bg-copper/15 text-copper font-bold rounded-full px-3 py-1.5 whitespace-nowrap text-xs">
          🏠 صفحه اصلی
        </Link>
        {showDealer && (
          <Link href="/dealer" className="bg-teal/15 text-teal font-bold rounded-full px-3 py-1.5 whitespace-nowrap text-xs">
            💰 خرید و فروش
          </Link>
        )}
        <button
          onClick={() => setMobileOpen(true)}
          className="mr-auto bg-surface2 border border-border text-ink font-bold rounded-full px-3.5 py-1.5 text-xs"
        >
          ☰ منو
        </button>
      </div>

      {mobileOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[300] md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/55" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="nav-sheet absolute inset-x-0 top-0 rounded-b-3xl border-b border-border p-4 pb-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="display-heading text-base">منو</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="bg-surface2 rounded-full w-8 h-8 text-sm"
                title="بستن"
              >
                ✕
              </button>
            </div>
            {groups.map((g) => (
              <div key={g.label} className="mb-4">
                <div className="text-[11px] font-bold text-muted mb-2 flex items-center gap-1.5">
                  <span>{g.icon}</span> {g.label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((item) =>
                    item.external ? (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileOpen(false)}
                        className="bg-surface2 border border-border rounded-xl px-3 py-2.5 text-xs text-ink text-center"
                      >
                        {item.label} ↗
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="bg-surface2 border border-border rounded-xl px-3 py-2.5 text-xs text-ink text-center"
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── Desktop (md+): unchanged — centered pills with dropdown groups. */}
      <div ref={containerRef} className="hidden md:flex items-center gap-1 flex-1 justify-center flex-wrap">
        <Link href="/tickets" className="bg-copper/15 text-copper font-bold rounded-full px-3 py-1 whitespace-nowrap text-xs">
          🏠 صفحه اصلی
        </Link>
        {showDealer && (
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
      {activeGroup && menuPos && mounted && createPortal(
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
        </div>,
        document.body
      )}
    </>
  );
}
