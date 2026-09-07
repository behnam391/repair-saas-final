/** Normalize legacy bare domains and keep Peyvo navigation inside the app. */
export function notificationLink(input?: string | null): string | null {
  const value = input?.trim();
  if (!value || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const candidate = /^(?:www\.)?peyvo\.ir(?:[/?#]|$)/i.test(value)
      ? `https://${value}` : value;
    const url = new URL(candidate, "https://peyvo.ir/");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (["peyvo.ir", "www.peyvo.ir"].includes(url.hostname)) return `${url.pathname}${url.search}${url.hash}`;
    return url.href;
  } catch { return null; }
}
