"use client";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/customer", label: "🔍 مغازه‌ها" },
  { href: "/customer/repairs", label: "🔧 تعمیرهای من" },
  { href: "/customer/ratings", label: "⭐ امتیازهای من" },
  { href: "/customer/profile", label: "👤 پروفایل" },
];

export default function CustomerNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full order-last pt-1 sm:w-auto sm:order-none sm:pt-0">
      {LINKS.map((l) => {
        const active = l.href === "/customer" ? pathname === "/customer" : pathname.startsWith(l.href);
        return (
          <a
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap text-xs rounded-lg px-3 py-1.5 transition-colors ${
              active ? "bg-copper text-[#1A1410] font-bold" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </a>
        );
      })}
      <ThemeToggle />
      <button
        onClick={() => signOut({ callbackUrl: "/customer/login" })}
        className="whitespace-nowrap text-xs text-danger rounded-lg px-2 py-1.5"
        title="خروج"
      >
        خروج ↩
      </button>
    </div>
  );
}
