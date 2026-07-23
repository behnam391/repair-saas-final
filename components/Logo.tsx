/**
 * Peyvo brand mark — the actual designed logo (blue-to-green flame/connector
 * mark + navy "Peyvo" wordmark), supplied by the user as brand-source/Peyvo-original.png
 * and cropped into two ready-to-use assets:
 *   - public/icons/icon-mark.png  → mark only, transparent bg (compact header use,
 *     favicon/app-icon source)
 *   - public/icons/logo-full.png → mark + wordmark, transparent bg (header/login use
 *     where there's room for the full lockup)
 * Used across every header, login screen, and the PWA/Android icon.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/icon-mark.png"
      alt="Peyvo"
      width={size}
      height={size}
      className="shrink-0"
      style={{ objectFit: "contain" }}
    />
  );
}

export default function Logo({
  size = 28,
  withText = true,
  textClassName = "text-base",
}: {
  size?: number;
  withText?: boolean;
  textClassName?: string;
}) {
  if (!withText) return <LogoMark size={size} />;
  // Two variants: navy wordmark for light theme, white wordmark for dark —
  // swapped purely with CSS so it reacts instantly to the theme toggle.
  return (
    <span className="inline-flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/logo-full.png"
        alt="Peyvo"
        style={{ height: size * 1.35, width: "auto", objectFit: "contain" }}
        className={`${textClassName} block dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/logo-full-dark.png"
        alt="Peyvo"
        style={{ height: size * 1.35, width: "auto", objectFit: "contain" }}
        className={`${textClassName} hidden dark:block`}
      />
    </span>
  );
}
