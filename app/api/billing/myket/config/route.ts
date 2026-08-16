import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/authz";
import { UnauthorizedError } from "@/lib/tenant";
import { getMyketServerConfig } from "@/lib/subscription/myket-config";
import { listSkus } from "@/lib/subscription/skus";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireCapability("billing.write");
    const config = await getMyketServerConfig();
    return NextResponse.json({
      enabled: !!config.publicKey && !!config.accessToken,
      publicKey: config.publicKey,
      packageName: config.packageName,
      skus: listSkus(),
      missing: [
        ...(!config.publicKey ? ["public_key"] : []),
        ...(!config.accessToken ? ["access_token"] : []),
      ],
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
