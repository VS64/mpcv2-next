import createMiddleware from "next-intl/middleware";
import { locales } from "@/i18n.config";
import { NextResponse, NextRequest } from "next/server";

export default createMiddleware({
  locales,
  defaultLocale: "fr",
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;

  const pathLocale = locales.find((locale) => pathname.startsWith(`/${locale}`));

  if (pathLocale && pathname.startsWith(`/${pathLocale}/mon-compte`) && !accessToken) {
    return NextResponse.redirect(new URL(`/${pathLocale}/connexion`, request.url));
  }

  if (pathLocale && (pathname === `/${pathLocale}/connexion` || pathname === `/${pathLocale}/inscription`) && accessToken) {
    return NextResponse.redirect(new URL(`/${pathLocale}`, request.url));
  }

  return createMiddleware({
    locales,
    defaultLocale: "fr",
  })(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
