import { NextResponse } from "next/server";
import { LATEST_ANDROID_RELEASE } from "@/lib/app-release";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await db.platformSettings.findUnique({ where: { id: "singleton" }, select: { bazaarUrl: true, myketUrl: true } }).catch(() => null);
  return NextResponse.json({
    ...LATEST_ANDROID_RELEASE,
    storeUrls: { bazaar: settings?.bazaarUrl || "", myket: settings?.myketUrl || "" },
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
