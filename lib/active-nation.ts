import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { normalizeRoles } from "@/lib/roles";

// Clerk migration: nationsId now comes from Clerk's session token (a
// nations_id claim added to the default session token via the org's
// public_metadata -- see docs/DECISIONS.md), not Auth0's custom claim.
// Clerk's own active-organization mechanism replaces the cookie-based
// active-nation switching this file used to do by hand for multi-nation
// operator accounts -- no real account has ever had more than one nation
// (see NavBar.tsx's removed NationSwitcher), so that plumbing is gone
// rather than ported; rebuild via Clerk's <OrganizationSwitcher /> if a
// real multi-nation operator account is ever needed.
//
// This file has grown into "server-side reads of Clerk's session claims"
// generally (getSessionRoles below too), not just nationsId -- kept in one
// file rather than split, since both are the same auth() call.
//
// Wrapped in React's cache() for the same reason lib/auth0.ts's
// getCachedSession was -- a single request commonly calls this from
// layout.tsx, a page.tsx, and every lib/permissions.ts requirePermission
// call, so this dedupes those to one auth() call per request.
export const getActiveNationsId = cache(async (): Promise<string | null> => {
  const { sessionClaims } = await auth();
  const value = sessionClaims?.nations_id;
  return typeof value === "string" && value ? value : null;
});

// Server-side counterpart to the client's useAuth().sessionClaims?.roles
// read (see NavBar.tsx) -- same claim, same normalizeRoles() extraction,
// just via auth() instead of the client hook. Cached per request for the
// same reason as getActiveNationsId above.
export const getSessionRoles = cache(async (): Promise<string[]> => {
  const { sessionClaims } = await auth();
  return normalizeRoles(sessionClaims?.roles);
});

// The "is anyone signed in at all" check every actions.ts/route.ts file's
// own requireUser()-style guard needs -- replaces reading Auth0's
// session?.user truthiness. Cached per request for the same reason as
// getActiveNationsId above.
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const { userId } = await auth();
  return userId ?? null;
});

// Clerk migration counterpart to lib/roles.ts's old Auth0-based
// getUserDisplayName -- for audit trails ("who pressed this button").
// currentUser() is a heavier call than auth() (fetches the full user
// record, not just token claims), so this is its own cached function
// rather than folded into getCurrentUserId above.
export const getCurrentUserDisplayName = cache(async (): Promise<string> => {
  const user = await currentUser();
  if (!user) return "Okänd användare";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (email) return email;
  return user.id;
});

// For use inside "use server" Server Actions and Route Handlers -- throws
// rather than redirecting, since those need an in-place error, not a
// navigation.
export async function requireActiveNationsId(): Promise<string> {
  const nationsId = await getActiveNationsId();
  if (!nationsId) {
    throw new Error("Ditt konto saknar en nationsID. Kontakta administratören.");
  }
  return nationsId;
}

// Page-level counterpart -- proxy.ts already blocks any authenticated
// request without a nationsID before it reaches a page, so this is
// defense-in-depth: if it's ever hit anyway, redirect to a clean
// explanation page instead of throwing (which would render Next's generic
// error screen).
export async function requireActiveNationsIdOrRedirect(): Promise<string> {
  const nationsId = await getActiveNationsId();
  if (!nationsId) {
    redirect("/nationsid-saknas");
  }
  return nationsId;
}
