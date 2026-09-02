"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LogoMark } from "./Logo";
import { canSeeNav } from "@/lib/permissions";
import { getNativeStore } from "@/lib/myket-billing-client";
import type { LucideIcon } from "lucide-react";
import {
  BadgeHelp, BarChart3, Boxes, ChevronDown, CircleUserRound, Clock3, FileText,
  Handshake, Headphones, History, House, Info, Landmark, Menu, MessageCircle,
  MonitorSmartphone, NotebookTabs, PackageSearch, QrCode, ReceiptText, RotateCcw, ShoppingBag, Smartphone, Store, UsersRound,
  Settings, WalletCards, Wrench,
} from "lucide-react";

type NavItem = { href: string; label: string; Icon: LucideIcon; external?: boolean };
type NavGroup = { label: string; items: NavItem[] };

export default function DashboardNav({
  role,
  guideUrl,
  shopType,
  serviceCategories = "MOBILE",
  shopName,
  userName,
}: {
  role: string;
  guideUrl: string | null;
  shopType?: string;
  serviceCategories?: string;
  shopName?: string;
  userName?: string;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Portal target only exists client-side; also, the drawer MUST be portaled
  // to <body>: the glass header's backdrop-filter turns the header into the
  // containing block for fixed-position descendants, which would trap and
  // clip a fixed overlay inside the header box.
  const [mounted, setMounted] = useState(false);
  const [billingContext, setBillingContext] = useState<"checking" | "web" | "myket" | "bazaar" | "native">("checking");
  useEffect(() => {
    setMounted(true);
    getNativeStore().then(setBillingContext);
  }, []);
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

  // Lock body scroll while the mobile drawer is open.
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

  const services = serviceCategories.split(",").filter((value) => value === "MOBILE" || value === "COMPUTER");
  const intakeItems: NavItem[] = services.length > 1
    ? [
        { href: "/tickets?new=1&device=MOBILE", label: "پذیرش موبایل", Icon: Smartphone },
        { href: "/tickets?new=1&device=COMPUTER", label: "پذیرش کامپیوتر", Icon: MonitorSmartphone },
      ]
    : services[0] === "COMPUTER"
      ? [{ href: "/tickets?new=1&device=COMPUTER", label: "پذیرش کامپیوتر", Icon: MonitorSmartphone }]
      : [{ href: "/tickets?new=1&device=MOBILE", label: "پذیرش موبایل", Icon: Smartphone }];

  const groups: NavGroup[] = [
    {
      label: "عملیات",
      items: [
        ...intakeItems,
        { href: "/inventory", label: "انبار قطعات", Icon: Boxes },
        { href: "/sales", label: "فروش مستقیم", Icon: ShoppingBag },
        { href: "/invoices", label: "فاکتورها", Icon: ReceiptText },
        { href: "/returns", label: "مرجوعی", Icon: RotateCcw },
        { href: "/pending-intakes", label: "پذیرش QR", Icon: QrCode },
      ],
    },
    {
      label: "ارتباطات",
      items: [
        { href: "/market", label: "بازار سراسری", Icon: Store },
        { href: "/chats", label: "چت‌ها", Icon: MessageCircle },
        { href: "/device-lookup", label: "پرونده گوشی", Icon: PackageSearch },
        { href: "/collaboration", label: "همکاری مغازه‌ها", Icon: Handshake },
        { href: "/partners", label: "دفترچه همکاران", Icon: NotebookTabs },
      ],
    },
    {
      label: "مشتریان",
      items: [
        { href: "/customers", label: "دفترچه مشتریان", Icon: UsersRound },
        { href: "/history", label: "سابقه و جستجو", Icon: History },
      ],
    },
    {
      label: "من",
      items: [
        { href: "/profile", label: "پروفایل من", Icon: CircleUserRound },
        { href: "/support", label: "پشتیبانی", Icon: Headphones },
        ...(guideUrl ? [{ href: guideUrl, label: "راهنمای سایت", Icon: BadgeHelp, external: true }] : []),
        { href: "/about", label: "درباره ما", Icon: Info },
      ],
    },
    ...(role === "OWNER"
      ? [{
          label: "مدیریت",
          items: [
            { href: "/reports", label: "گزارش‌ها", Icon: BarChart3 },
            { href: "/admin", label: "تنظیمات تعمیرگاه", Icon: Settings },
            { href: "/expenses", label: "دخل و خرج", Icon: Landmark },
            { href: "/admin/billing", label: "اشتراک و پرداخت", Icon: FileText },
            { href: "/admin/wallet", label: "کیف پول", Icon: WalletCards },
          ],
        }]
      : []),
  ];

  // Hide any nav entry this role shouldn't see, then drop groups that end
  // up empty. Owner is unaffected (canSeeNav returns true for OWNER).
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) =>
        canSeeNav(role, item.href.split("?")[0]) && (item.href !== "/admin/wallet" || billingContext === "web")
      ),
    }))
    .filter((g) => g.items.length > 0);

  const activeGroup = visibleGroups.find((g) => g.label === openGroup);
  const showDealer = (shopType === "DEALER" || shopType === "BOTH") && canSeeNav(role, "/dealer");

  return (
    <>
      {/* ── Mobile (below md): quick pills + «منو» opening a Telegram-style
          side drawer. */}
      <div className="flex md:hidden items-center gap-1.5 w-full order-last pt-1">
        <button
          onClick={() => setMobileOpen(true)}
          className="app-nav-trigger"
        >
          <Menu size={15} /> منو
        </button>
        <div className="flex items-center gap-1.5 ms-auto">
          <Link href="/tickets" className="app-nav-quick is-primary">
            <House size={14} /> صفحه اصلی
          </Link>
          {showDealer && (
            <Link href="/dealer" className="app-nav-quick">
              <ShoppingBag size={14} /> خرید و فروش
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[300] md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/55 drawer-fade" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="nav-sheet drawer-enter absolute inset-y-0 right-0 w-[80vw] max-w-[320px] overflow-y-auto rounded-l-3xl"
          >
            {/* Profile header — like Telegram's drawer top. */}
            <div className="drawer-head px-4 pt-5 pb-4 rounded-tl-3xl">
              <div className="bg-white/95 rounded-2xl w-12 h-12 flex items-center justify-center shadow-lg">
                <LogoMark size={30} />
              </div>
              <div className="mt-3 font-extrabold text-white text-sm">{shopName ?? "Peyvo"}</div>
              <div className="text-white/85 text-[11px] mt-0.5">{userName ?? ""}</div>
            </div>

            {/* Quick actions */}
            <nav className="py-1.5">
              <DrawerRow href="/tickets" Icon={House} label="صفحه اصلی" onGo={() => setMobileOpen(false)} bold />
              {showDealer && (
                <DrawerRow href="/dealer" Icon={ShoppingBag} label="خرید و فروش" onGo={() => setMobileOpen(false)} bold />
              )}

              {visibleGroups.map((g) => (
                <div key={g.label}>
                  <div className="h-px bg-border mx-4 my-1.5" />
                  <div className="px-4 pt-1.5 pb-1 text-[10px] font-bold text-muted">{g.label}</div>
                  {g.items.map((item) => (
                    <DrawerRow
                      key={item.href}
                      href={item.href}
                      Icon={item.Icon}
                      label={item.label}
                      external={item.external}
                      onGo={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        </div>,
        document.body
      )}

      {/* ── Desktop (md+): unchanged — centered pills with dropdown groups. */}
      <div ref={containerRef} className="hidden md:flex items-center gap-1 flex-1 justify-center flex-wrap">
        <Link href="/tickets" className="app-nav-quick is-primary">
          <House size={14} /> صفحه اصلی
        </Link>
        {showDealer && (
          <Link href="/dealer" className="app-nav-quick">
            <ShoppingBag size={14} /> خرید و فروش
          </Link>
        )}

        {visibleGroups.map((g) => (
          <button
            key={g.label}
            ref={(el) => { btnRefs.current[g.label] = el; }}
            onClick={() => toggleGroup(g.label)}
            className={`app-nav-group ${
              openGroup === g.label ? "is-open" : ""
            }`}
          >
            {g.label} <ChevronDown size={13} className={`transition-transform ${openGroup === g.label ? "rotate-180" : ""}`} />
          </button>
        ))}
      </div>

      {/* Rendered at the body level so it's never clipped or trapped by the
          glass header's backdrop-filter containing block. */}
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
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-muted hover:bg-surface2 hover:text-ink whitespace-nowrap">
                <item.Icon size={16} /> {item.label} ↗
              </a>
            ) : (
              <Link key={item.href} href={item.href} onClick={() => setOpenGroup(null)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-muted hover:bg-surface2 hover:text-ink whitespace-nowrap">
                <item.Icon size={16} /> {item.label}
              </Link>
            )
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/* One flat Telegram-style drawer row: icon bubble + label. */
function DrawerRow({
  href,
  Icon,
  label,
  onGo,
  external,
  bold,
}: {
  href: string;
  Icon: LucideIcon;
  label: string;
  onGo: () => void;
  external?: boolean;
  bold?: boolean;
}) {
  const cls = `flex items-center gap-3 px-4 py-2.5 text-[13px] active:bg-surface2 ${bold ? "font-bold" : ""}`;
  const inner = (
    <>
      <span className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-copper shrink-0"><Icon size={16} /></span>
      <span className="flex-1">{label}</span>
      {external && <span className="text-muted text-[10px]">↗</span>}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onGo} className={cls}>{inner}</a>
  ) : (
    <Link href={href} onClick={onGo} className={cls}>{inner}</Link>
  );
}
