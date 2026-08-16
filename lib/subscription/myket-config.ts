// Server-only Myket configuration. The public RSA key may be returned to the
// native billing SDK; the partner access token never leaves the server.

import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export interface MyketServerConfig {
  packageName: string;
  publicKey: string;
  accessToken: string;
}

/** IabHelper expects the Base64 key body, without PEM wrappers/whitespace. */
export function normalizeMyketPublicKey(value: string): string {
  return value
    .replace(/-----BEGIN (?:RSA )?PUBLIC KEY-----/g, "")
    .replace(/-----END (?:RSA )?PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export async function getMyketServerConfig(): Promise<MyketServerConfig> {
  let settings: any = null;
  try {
    settings = await db.platformSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    // Environment fallbacks still allow billing during a transient settings
    // read failure (and make local/preview testing straightforward).
  }

  const storedPublicKey = decryptSecret(settings?.myketRsaPublicKey);
  const storedAccessToken = decryptSecret(settings?.myketAccessToken);
  return {
    packageName: (process.env.MYKET_PACKAGE_NAME || "com.peyvo.app").trim(),
    publicKey: normalizeMyketPublicKey(storedPublicKey || process.env.MYKET_RSA_PUBLIC_KEY || ""),
    accessToken: (storedAccessToken || process.env.MYKET_ACCESS_TOKEN || "").trim(),
  };
}
