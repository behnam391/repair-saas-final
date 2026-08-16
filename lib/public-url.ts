const DEFAULT_PUBLIC_ORIGIN = "https://peyvo.ir";

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Stable customer-facing origin.
 *
 * Never build payment callbacks or links sent to customers from Vercel's
 * request origin: native builds and preview deployments may reach the same
 * application through a *.vercel.app host, which Zarinpal correctly rejects
 * when the terminal is registered for peyvo.ir.
 */
export function resolvePublicOrigin(
  configuredValue: string | undefined,
  requestOrigin: string | undefined,
  isProduction: boolean
): string {
  const configured = normalizeOrigin(configuredValue);
  if (configured) return configured;

  if (!isProduction) {
    return normalizeOrigin(requestOrigin) || "http://localhost:3000";
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

export function getPublicOrigin(requestOrigin?: string): string {
  return resolvePublicOrigin(
    process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin,
    process.env.NODE_ENV === "production"
  );
}

export function getPublicUrl(path: string, requestOrigin?: string): string {
  const origin = getPublicOrigin(requestOrigin);
  return new URL(path.replace(/^\/+/, ""), `${origin}/`).toString();
}

export { DEFAULT_PUBLIC_ORIGIN };
