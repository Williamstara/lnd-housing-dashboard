import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getNationsId } from "@/lib/nations";

// Paths where an authenticated-but-nationsID-less user shouldn't be bounced:
// the Auth0 SDK's own routes, API routes (which return JSON 401/403 errors
// of their own via requireNationsId — a redirect would break fetch() callers),
// and the explanation page itself (avoid a redirect loop).
// /admin is excluded too — an admin's own account may have no nationsID
// (they manage every nation, not one), and without this they'd get bounced
// to /nationsid-saknas before ever reaching the admin page.
const SKIP_NATIONS_CHECK = ["/api", "/auth", "/nationsid-saknas", "/admin", "/policy"];

function skipNationsCheck(pathname: string): boolean {
  return SKIP_NATIONS_CHECK.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Next.js renamed `middleware.ts` to `proxy.ts` (v16). This mounts the
// Auth0 SDK's routes (/auth/login, /auth/logout, /auth/callback, ...),
// keeps the session cookie fresh on every request, and centrally blocks any
// logged-in user without a nationsID claim from reaching app pages — every
// user must belong to a nation for the multi-tenant data scoping to be safe.
// This runs on every request (including client-side navigations), unlike a
// check in the root layout, which Next.js does not re-run on client-side
// route transitions.
export async function proxy(request: NextRequest) {
  const authResponse = await auth0.middleware(request);

  const { pathname } = request.nextUrl;
  if (skipNationsCheck(pathname) || authResponse.headers.get("location")) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (session?.user && !getNationsId(session.user)) {
    return NextResponse.redirect(new URL("/nationsid-saknas", request.url));
  }

  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon2.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
