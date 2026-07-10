import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  return (
    <div className="min-h-screen">
      <header className="border-b border-surface2 sticky top-0 bg-bg/90 backdrop-blur z-20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="shrink-0">
            <div className="display-heading text-sm">{user.shopName}</div>
            <div className="text-[11px] text-muted">{user.name} · {roleLabel(user.role)}</div>
          </div>
          <nav className="flex items-center gap-4 text-xs overflow-x-auto no-scrollbar">
            <Link href="/tickets" className="text-muted hover:text-ink whitespace-nowrap">تیکت‌ها</Link>
            <Link href="/inventory" className="text-muted hover:text-ink whitespace-nowrap">انبار</Link>
            <Link href="/invoices" className="text-muted hover:text-ink whitespace-nowrap">فاکتورها</Link>
            <Link href="/market" className="text-muted hover:text-ink whitespace-nowrap">بازار سراسری</Link>
            <Link href="/device-lookup" className="text-muted hover:text-ink whitespace-nowrap">پرونده گوشی</Link>
            <Link href="/chats" className="text-muted hover:text-ink whitespace-nowrap">چت‌ها</Link>
            {user.role === "OWNER" && <Link href="/admin" className="text-muted hover:text-ink whitespace-nowrap">مدیریت</Link>}
            {user.role === "OWNER" && <Link href="/admin/billing" className="text-muted hover:text-ink whitespace-nowrap">اشتراک</Link>}
            <span className="w-px h-4 bg-surface2 shrink-0" />
            <ThemeToggle />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function roleLabel(role: string) {
  return (
    { OWNER: "مدیر", FRONTDESK: "پذیرش", HARDWARE: "سخت‌افزار", SOFTWARE: "نرم‌افزار", BOARD: "تخصصی" }[role] ?? role
  );
}
