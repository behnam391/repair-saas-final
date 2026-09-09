import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import "./workspace.css";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.disabled || user.validationUnavailable || !user.shopId || user.isSuperAdmin || user.isCustomer) redirect("/login");
  if (!["OWNER", "FRONTDESK"].includes(user.role)) redirect("/tickets");
  return <div className="industry-shell" dir="rtl"><header className="industry-top"><Link href="/industry-workspaces"><b>پیوو</b> · داشبوردهای تخصصی</Link><div><span>{user.shopName}</span><ThemeToggle/><Link href="/tickets">داشبورد فعلی</Link></div></header><main>{children}</main></div>;
}
