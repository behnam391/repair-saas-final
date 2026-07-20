import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerNav from "@/components/CustomerNav";

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
      <header className="border-b border-surface2 sticky top-0 bg-bg/90 backdrop-blur z-20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="shrink-0">
            <div className="display-heading text-sm">پنل مشتری</div>
            <div className="text-[11px] text-muted">{user.name}</div>
          </div>
          <CustomerNav />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
