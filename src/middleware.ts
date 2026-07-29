import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js middleware — runs on every matched request before the route handler.
 * Protects director-only routes by validating the directorToken cookie exists.
 *
 * Note: Full token validation against the DB happens server-side in the API
 * routes/socket handlers. This middleware provides early rejection for
 * unauthenticated users trying to access protected pages.
 */
export function middleware(req: NextRequest) {
  const directorToken = req.cookies.get("directorToken");

  if (!directorToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create/:path*", "/manage/:path*"],
};
