"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Boxes, CircleDollarSign, FileText, Handshake, Headphones,
  House, MessageSquareText, PackagePlus, Settings, Store, UserRound, UsersRound, Wrench,
  type LucideIcon,
} from "lucide-react";
import Logo from "./Logo";
import { canSeeNav } from "@/lib/permissions";

type Item = { href: string; label: string; Icon: LucideIcon; owner?: boolean; dealer?: boolean };

const groups: { label: string; items: Item[] }[] = [
  { label: "کار روزانه", items: [
    { href: "/tickets", label: "داشبورد", Icon: House },
    { href: "/tickets?new=1", label: "پذیرش دستگاه", Icon: PackagePlus },
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

export default function ShopSidebar({ role, shopType, shopName, userName }: { role: string; shopType?: string; shopName: string; userName: string }) {
  const pathname = usePathname();
  const dealer = shopType === "DEALER" || shopType === "BOTH";
  return (
    <aside className="shop-sidebar no-print">
      <Link href="/tickets" className="shop-sidebar-brand"><Logo size={34} /></Link>
      <nav>
        {groups.map((group) => {
          const items = group.items.filter((item) =>
            (!item.owner || role === "OWNER") && (!item.dealer || dealer) && canSeeNav(role, item.href.split("?")[0])
          );
          if (!items.length) return null;
          return <section key={group.label}><small>{group.label}</small>{items.map(({ href, label, Icon }) => {
            const clean = href.split("?")[0];
            const active = clean === "/tickets" ? pathname === clean : pathname.startsWith(clean);
            return <Link href={href} key={`${label}-${href}`} className={active ? "is-active" : ""}><Icon size={18} /><span>{label}</span></Link>;
          })}</section>;
        })}
      </nav>
      <div className="shop-sidebar-user"><i>{userName.slice(0, 1)}</i><span><b>{userName}</b><small><em /> {shopName}</small></span></div>
    </aside>
  );
}
