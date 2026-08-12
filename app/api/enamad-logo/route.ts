import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const settings = await db.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { enamadId: true, enamadCode: true },
    });
    const id = settings?.enamadId?.trim();
    const code = settings?.enamadCode?.trim();
    if (!id || !code) return new NextResponse(null, { status: 404 });

    const query = `id=${encodeURIComponent(id)}&Code=${encodeURIComponent(code)}`;
    const origin = new URL(req.url).origin;
    const image = await fetch(`https://trustseal.enamad.ir/logo.aspx?${query}`, {
      headers: { Referer: `${origin}/`, "User-Agent": "Peyvo-Trust-Seal/1.0" },
      cache: "no-store",
    });
    if (!image.ok) return new NextResponse(null, { status: 502 });

    return new NextResponse(await image.arrayBuffer(), {
      headers: {
        "Content-Type": image.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
