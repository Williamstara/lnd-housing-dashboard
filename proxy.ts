import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { isRestrictedToTodo, normalizeRoles } from "@/lib/roles";

// Paths where a signed-in-but-nationsID-less user shouldn't be bounced:
// the sign-in/sign-up/nationsid-saknas pages themselves (avoid redirect
// loops / blocking access to the pages that would fix this), API routes
// (they return their own 401/403 JSON via requireActiveNationsId — a
// redirect would break fetch() callers), and /admin (an admin's own
// account may have no nationsID, since they manage every nation, not one).
const SKIP_NATIONS_CHECK = ["/api", "/admin", "/sign-in", "/sign-up", "/nationsid-saknas"];

function skipNationsCheck(pathname: string): boolean {
  return SKIP_NATIONS_CHECK.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Next.js renamed `middleware.ts` to `proxy.ts` (v16).
//
// Deliberately does NOT call auth.protect() here anymore. Clerk deprecated
// middleware-based route protection (createRouteMatcher + auth.protect() in
// proxy.ts) in favor of resource-based checks -- see
// https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher.
// The reasoning: path-matching in middleware can diverge from how Next.js
// actually routes a request (Server Actions are invoked by ID, not path;
// framework-level bypasses have let requests skip middleware entirely), so
// a middleware-only gate can create a false sense of security. Each of this
// app's 13 protected page.tsx files now calls `await auth.protect()` itself
// as its first line -- that's the real enforcement. Clerk still requires
// clerkMiddleware() to run on every request for session syncing, so this
// file is kept, just narrowed to non-auth request handling: the
// nationsID-missing and vaktmästare redirects below are UX/business-rule
// routing, not the authentication boundary, and Clerk's own migration guide
// explicitly allows keeping this class of redirect in middleware ("cross-
// cutting session task redirects, as a performance optimization only, not
// security") since requireActiveNationsId()/requireActiveNationsIdOrRedirect()
// already independently enforce nationsID at the resource level in every
// page/action/route (unchanged, pre-dates this migration).
export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const { userId, sessionClaims } = await auth();

  // Not authenticated: nothing below applies. Each page's own
  // auth.protect() is what redirects an unauthenticated request to
  // sign-in -- redirecting to /nationsid-saknas here instead (the old
  // behavior) would be wrong for a signed-out visitor.
  if (!userId || skipNationsCheck(pathname)) {
    return NextResponse.next();
  }

  const nationsId = sessionClaims?.nations_id;
  if (typeof nationsId !== "string" || !nationsId) {
    return NextResponse.redirect(new URL("/nationsid-saknas", request.url));
  }

  // vaktmästare is access-restricted rather than access-granting — see
  // isRestrictedToTodo in lib/roles.ts.
  const roles = normalizeRoles(sessionClaims?.roles);
  if (isRestrictedToTodo(roles) && !pathname.startsWith("/todo")) {
    return NextResponse.redirect(new URL("/todo", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon2.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
