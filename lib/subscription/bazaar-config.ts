import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { normalizeMyketPublicKey } from "./myket-config";

export interface BazaarServerConfig {
  packageName: string;
  publicKey: string;
}

export async function getBazaarServerConfig(): Promise<BazaarServerConfig> {
  let settings: any = null;
  try {
    settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  } catch {}
  const storedPublicKey = decryptSecret(settings?.bazaarRsaPublicKey);
  return {
    packageName: (process.env.BAZAAR_PACKAGE_NAME || "com.peyvo.app").trim(),
    publicKey: normalizeMyketPublicKey(storedPublicKey || process.env.BAZAAR_RSA_PUBLIC_KEY || ""),
  };
}
