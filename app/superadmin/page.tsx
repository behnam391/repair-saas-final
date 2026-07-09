import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SuperAdminClient from "./client";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isSuperAdmin) redirect("/superadmin/login");
  return <SuperAdminClient />;
}
