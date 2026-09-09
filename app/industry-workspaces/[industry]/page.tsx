import { notFound } from "next/navigation";
import { isIndustryKey } from "@/lib/industry-workspaces";
import IndustryDashboard from "@/components/IndustryDashboard";
export default function Page({ params }: { params: { industry: string } }) {
  if (!isIndustryKey(params.industry)) notFound();
  return <IndustryDashboard industry={params.industry}/>;
}
