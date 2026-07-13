import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

// Next.js renamed `middleware.ts` to `proxy.ts` (v16). This mounts the
// Auth0 SDK's routes (/auth/login, /auth/logout, /auth/callback, ...) and
// keeps the session cookie fresh on every request.
export async function proxy(request: NextRequest) {
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
