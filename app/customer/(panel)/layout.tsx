import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerNav from "@/components/CustomerNav";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// Customer-panel shell. Guards every page in this group: only a signed-in
// PlatformCustomer session gets through — shop staff and platform admins
// are bounced to the customer login (their sessions don't carry isCustomer).
export default async function CustomerPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.isCustomer) redirect("/customer/login");

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <Logo size={26} withText={false} />
            <div className="min-w-0">
              <div className="display-heading text-sm leading-tight truncate">پنل مشتری Peyvo</div>
              <div className="text-[11px] text-muted truncate">{user.name}</div>
            </div>
          </div>
          <CustomerNav userName={user.name} />
        </div>
        <div className="brand-underline -mx-4 mt-3" />
      </header>
      <main className="page-enter">{children}</main>
    </div>
  );
}
