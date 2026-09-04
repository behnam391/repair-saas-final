import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathLocale = pathname === "/en" || pathname.startsWith("/en/")
    ? "en"
    : pathname === "/ar" || pathname.startsWith("/ar/")
      ? "ar"
      : null;
  const queryLocale = request.nextUrl.searchParams.get("lang");
  const locale = pathLocale || (queryLocale === "en" || queryLocale === "ar" ? queryLocale : "fa");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-peyvo-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|images|fonts|downloads|favicon.ico|sw.js|manifest.json).*)"],
};
