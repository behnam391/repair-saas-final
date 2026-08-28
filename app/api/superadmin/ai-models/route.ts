import { NextResponse } from "next/server";
import { requireSuperAdmin, UnauthorizedError } from "@/lib/tenant";
import { loadAiConfig } from "@/lib/ai/config";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    await requireSuperAdmin("settings");
    const config = await loadAiConfig();
    if (!config.baseUrl || !config.apiKey) {
      return NextResponse.json({ error: "provider_not_configured" }, { status: 400 });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const bases = [config.baseUrl.replace(/\/+$/, "")];
      if (config.baseUrl.includes("inference.hetzner.com") && !bases.includes("https://inference.hetzner.com/v1")) {
        bases.push("https://inference.hetzner.com/v1");
      }
      const models = new Set<string>();
      for (const base of bases) {
        try {
          const res = await fetch(`${base}/models`, {
            headers: { Authorization: `Bearer ${config.apiKey}` }, signal: controller.signal, cache: "no-store",
          });
          const data: any = await res.json().catch(() => ({}));
          if (res.ok && Array.isArray(data?.data)) {
            for (const item of data.data) if (typeof item?.id === "string") models.add(item.id);
          }
        } catch { /* try the other documented Hetzner endpoint */ }
      }
      if (!models.size) return NextResponse.json({ error: "provider_error" }, { status: 502 });
      return NextResponse.json({ models: [...models] });
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "connection_failed" }, { status: 502 });
  }
}
