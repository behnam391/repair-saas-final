import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathLocale = pathname === "/en" || pathname.startsWith("/en/")
    ? "en"
    : pathname === "/ar" || pathname.startsWith("/ar/")
      ? "ar"
      : null;
  const queryLocale = request.nextUrl.searchParams.get("lang");
  const savedPanelLocale = request.cookies.get("peyvo_panel_locale")?.value;
  const isPanel = pathname.startsWith("/customer") || ["/tickets", "/history", "/customers", "/inventory", "/invoices", "/expenses", "/dealer", "/collaboration", "/chats", "/support", "/profile", "/reports", "/admin", "/market", "/device-lookup", "/partners", "/sales", "/returns", "/pending-intakes"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const locale = pathLocale || (queryLocale === "en" || queryLocale === "ar" ? queryLocale : isPanel && (savedPanelLocale === "en" || savedPanelLocale === "ar") ? savedPanelLocale : "fa");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-peyvo-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|images|fonts|downloads|favicon.ico|sw.js|manifest.json).*)"],
};
