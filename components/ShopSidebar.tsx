"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3, Boxes, CircleDollarSign, FileText, Handshake, Headphones,
  House, Menu, MessageSquareText, MonitorSmartphone, PackagePlus, PanelRightClose, Settings, Smartphone, Store, UserRound, UsersRound, Wrench,
  type LucideIcon,
} from "lucide-react";
import Logo from "./Logo";
import { canSeeNav } from "@/lib/permissions";

type Item = { href: string; label: string; Icon: LucideIcon; owner?: boolean; dealer?: boolean };

const groups: { label: string; items: Item[] }[] = [
  { label: "کار روزانه", items: [
    { href: "/tickets", label: "داشبورد", Icon: House },
    { href: "/history", label: "تعمیرات و سوابق", Icon: Wrench },
    { href: "/customers", label: "مشتریان", Icon: UsersRound },
  ] },
  { label: "عملیات", items: [
    { href: "/inventory", label: "انبار و قطعات", Icon: Boxes },
    { href: "/invoices", label: "فاکتورها", Icon: FileText },
    { href: "/expenses", label: "امور مالی", Icon: CircleDollarSign, owner: true },
    { href: "/dealer", label: "خرید و فروش", Icon: Store, dealer: true },
  ] },
  { label: "ارتباط و مدیریت", items: [
    { href: "/collaboration", label: "همکاری تعمیرگاه‌ها", Icon: Handshake },
    { href: "/chats", label: "پیام‌ها", Icon: MessageSquareText },
    { href: "/support", label: "پشتیبانی", Icon: Headphones },
    { href: "/profile", label: "پروفایل و حساب من", Icon: UserRound },
    { href: "/reports", label: "گزارش‌ها", Icon: BarChart3, owner: true },
    { href: "/admin", label: "تنظیمات تعمیرگاه", Icon: Settings, owner: true },
  ] },
];

export default function ShopSidebar({ role, shopType, serviceCategories = "MOBILE", shopName, userName, avatarUrl }: { role: string; shopType?: string; serviceCategories?: string; shopName: string; userName: string; avatarUrl?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebarRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const dealer = shopType === "DEALER" || shopType === "BOTH";
  const services = serviceCategories.split(",").filter((value) => value === "MOBILE" || value === "COMPUTER");
  const intakeItems: Item[] = services.length > 1
    ? [
        { href: "/tickets?new=1&device=MOBILE", label: "پذیرش موبایل", Icon: Smartphone },
        { href: "/tickets?new=1&device=COMPUTER", label: "پذیرش کامپیوتر", Icon: MonitorSmartphone },
      ]
    : services[0] === "COMPUTER"
      ? [{ href: "/tickets?new=1&device=COMPUTER", label: "پذیرش کامپیوتر", Icon: MonitorSmartphone }]
      : [{ href: "/tickets?new=1&device=MOBILE", label: "پذیرش موبایل", Icon: PackagePlus }];
  const menuGroups = groups.map((group) => group.label === "کار روزانه"
    ? { ...group, items: [group.items[0], ...intakeItems, ...group.items.slice(1)] }
    : group);

  useEffect(() => {
    try {
      const cookiePreference = document.cookie.match(/(?:^|; )peyvo_shop_sidebar=(0|1)(?:;|$)/)?.[1];
      const savedPreference = cookiePreference ?? window.localStorage.getItem("peyvo-shop-sidebar-collapsed");
      setCollapsed(savedPreference === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const shell = sidebarRef.current?.closest(".shop-shell");
    shell?.classList.toggle("is-sidebar-collapsed", collapsed);
    return () => shell?.classList.remove("is-sidebar-collapsed");
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("peyvo-shop-sidebar-collapsed", next ? "1" : "0");
        document.cookie = `peyvo_shop_sidebar=${next ? "1" : "0"}; max-age=31536000; path=/; samesite=lax`;
      } catch {}
      return next;
    });
  };

  return (
    <aside ref={sidebarRef} className={`shop-sidebar no-print ${collapsed ? "is-collapsed" : ""}`}>
      <Link href="/tickets" className="shop-sidebar-brand" title={collapsed ? "داشبورد پیوو" : undefined}>
        <Logo size={34} withText={!collapsed} />
      </Link>
      <button
        type="button"
        className="shop-sidebar-collapse"
        onClick={toggleCollapsed}
        title={collapsed ? "باز کردن منو" : "جمع کردن منو"}
        aria-label={collapsed ? "باز کردن منوی داشبورد" : "جمع کردن منوی داشبورد"}
        aria-expanded={!collapsed}
        aria-controls="shop-sidebar-nav"
      >
        {collapsed ? <Menu size={18} /> : <PanelRightClose size={18} />}
      </button>
      <nav id="shop-sidebar-nav">
        {menuGroups.map((group) => {
          const items = group.items.filter((item) =>
            (!item.owner || role === "OWNER") && (!item.dealer || dealer) && canSeeNav(role, item.href.split("?")[0])
          );
          if (!items.length) return null;
          return <section key={group.label}><small>{group.label}</small>{items.map(({ href, label, Icon }) => {
            const clean = href.split("?")[0];
            const hrefParams = new URLSearchParams(href.split("?")[1] ?? "");
            const isIntake = hrefParams.get("new") === "1";
            const active = isIntake
              ? pathname === "/tickets" && searchParams.get("new") === "1" && searchParams.get("device") === hrefParams.get("device")
              : clean === "/tickets"
                ? pathname === clean && searchParams.get("new") !== "1"
                : pathname.startsWith(clean);
            return <Link href={href} key={`${label}-${href}`} title={collapsed ? label : undefined} className={active ? "is-active" : ""}><Icon size={18} /><span>{label}</span></Link>;
          })}</section>;
        })}
      </nav>
      <Link href="/profile" className="shop-sidebar-user" title="پروفایل و حساب من">
        <i>{avatarUrl ? <img src={avatarUrl} alt={`تصویر ${userName}`} /> : userName.slice(0, 1)}</i>
        <span><b>{userName}</b><small><em /> {shopName}</small></span>
      </Link>
    </aside>
  );
}
