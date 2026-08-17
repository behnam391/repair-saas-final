import { NextResponse } from "next/server";
import { LATEST_ANDROID_RELEASE } from "@/lib/app-release";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(LATEST_ANDROID_RELEASE, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
