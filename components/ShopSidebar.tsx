"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3, Boxes, CircleDollarSign, FileText, Handshake, Headphones,
  House, MessageSquareText, MonitorSmartphone, PackagePlus, Settings, Smartphone, Store, UserRound, UsersRound, Wrench,
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
  return (
    <aside className="shop-sidebar no-print">
      <Link href="/tickets" className="shop-sidebar-brand"><Logo size={34} /></Link>
      <nav>
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
            return <Link href={href} key={`${label}-${href}`} className={active ? "is-active" : ""}><Icon size={18} /><span>{label}</span></Link>;
          })}</section>;
        })}
      </nav>
      <div className="shop-sidebar-user">
        <i>{avatarUrl ? <img src={avatarUrl} alt={`تصویر ${userName}`} /> : userName.slice(0, 1)}</i>
        <span><b>{userName}</b><small><em /> {shopName}</small></span>
      </div>
    </aside>
  );
}
