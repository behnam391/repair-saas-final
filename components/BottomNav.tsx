"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard, Globe, Home, MessageSquare, Package, Receipt,
  Search, Star, Store, User, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { isTechnician } from "@/lib/permissions";
import { usePanelI18n } from "@/lib/panel-i18n";

type Item = { href: string; label: string; Icon: LucideIcon };

export function ShopBottomNav({ role }: { role: string }) {
  const items = useMemo<Item[]>(() => {
    if (isTechnician(role)) return [
      { href: "/tickets", label: "تعمیرها", Icon: Wrench },
      { href: "/chats", label: "پیام‌ها", Icon: MessageSquare },
      { href: "/market", label: "بازار", Icon: Globe },
      { href: "/device-lookup", label: "پرونده", Icon: Search },
      { href: "/profile", label: "پروفایل", Icon: User },
    ];
    if (role === "FRONTDESK") return [
      { href: "/tickets", label: "تعمیرها", Icon: Home },
      { href: "/customers", label: "مشتریان", Icon: Users },
      { href: "/inventory", label: "انبار", Icon: Package },
      { href: "/invoices", label: "فاکتورها", Icon: Receipt },
      { href: "/profile", label: "پروفایل", Icon: User },
    ];
    return [
      { href: "/tickets", label: "خانه", Icon: Home },
      { href: "/customers", label: "مشتریان", Icon: Users },
      { href: "/inventory", label: "انبار", Icon: Package },
      { href: "/profile", label: "پروفایل", Icon: User },
      { href: "/admin/billing", label: "اشتراک", Icon: CreditCard },
    ];
  }, [role]);
  return <SimpleBottomNav items={items} />;
}

export function CustomerBottomNav() {
  const items = useMemo<Item[]>(() => [
    { href: "/customer", label: "مغازه‌ها", Icon: Store },
    { href: "/customer/repairs", label: "تعمیرهای من", Icon: Wrench },
    { href: "/customer/ratings", label: "امتیازها", Icon: Star },
    { href: "/customer/profile", label: "پروفایل", Icon: User },
  ], []);
  return <SimpleBottomNav items={items} />;
}

// Kept as a compatibility export for any older layout importing this name.
export function LiquidBottomNav({ items }: { items: Item[] }) {
  return <SimpleBottomNav items={items} />;
}

function SimpleBottomNav({ items }: { items: Item[] }) {
  const { t } = usePanelI18n();
  const pathname = usePathname() || "";
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="simple-bnav-wrap no-print md:hidden">
      <nav className="simple-bnav" aria-label={t("ناوبری اصلی")}>
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}>
              <span><item.Icon size={21} strokeWidth={active ? 2.35 : 1.9} /></span>
              <small>{t(item.label)}</small>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
