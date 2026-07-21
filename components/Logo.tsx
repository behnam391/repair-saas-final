/**
 * Peyvo brand mark — two interlocked rings (copper + teal) reading as
 * "پیوند" (the connector): technician, seller/dealer, customer and the
 * platform's systems, linked into one ring. Used across every header,
 * login screen, and the PWA/Android icon (see public/icons/icon.svg,
 * which mirrors this same mark as static SVG).
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="62" height="62" rx="16" fill="#14161B" stroke="#2B2F3D" />
      <circle cx="24" cy="32" r="13" fill="none" stroke="#E08A3E" strokeWidth="7" />
      <circle cx="40" cy="32" r="13" fill="none" stroke="#35C9A5" strokeWidth="7" />
    </svg>
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
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      {withText && (
        <span className={`font-extrabold ${textClassName}`} style={{ letterSpacing: "-0.02em" }}>
          <span style={{ color: "#E08A3E" }}>Pey</span>
          <span style={{ color: "#35C9A5" }}>vo</span>
        </span>
      )}
    </div>
  );
}
