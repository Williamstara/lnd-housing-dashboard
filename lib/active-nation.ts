import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@auth0/nextjs-auth0/types";
import { getAvailableNations } from "@/lib/nations";

// docs/SAAS-READINESS-ROADMAP.md Tier 1.2 — lets an operator's Auth0
// account belong to more than one nation (nationsID claim as an array,
// external Auth0 Action change — see lib/nations.ts) and pick which one
// they're currently working in, instead of assignNationsId's today-only
// "move between nations" model. Separate file from lib/nations.ts (not
// "server-only") specifically so cookies()/next/headers never end up in a
// bundle NavBar.tsx (a client component) pulls in.
//
// A single-nation user — everyone today, until the Auth0 Action is changed
// to emit an array — never touches the cookie at all (short-circuited
// below), so this is a zero-behavior-change addition for the current app.
const ACTIVE_NATION_COOKIE = "active-nations-id";

// Never trusts the cookie blindly: only honored if it's actually one of the
// user's real available nations (from their Auth0 claim), so a tampered or
// stale cookie can't grant scope to a nation the user's claim doesn't
// include — same "never trust nationsId from the client" posture as every
// Server Action in this app.
//
// Wrapped in React's cache() — same rationale as lib/auth0.ts's
// getCachedSession: a single request now calls this from layout.tsx,
// page.tsx, and every lib/*.ts call's requirePermission, so without
// caching this would reintroduce the exact N-redundant-calls-per-request
// pattern that getCachedSession was added to fix. Keyed on the `user`
// object reference, which is stable within one request because it always
// comes from the same getCachedSession() call.
export const getActiveNationsId = cache(
  async (user: User | null | undefined): Promise<string | null> => {
    const available = getAvailableNations(user);
    if (available.length === 0) return null;
    if (available.length === 1) return available[0];
    const cookieStore = await cookies();
    const active = cookieStore.get(ACTIVE_NATION_COOKIE)?.value;
    return active && available.includes(active) ? active : available[0];
  }
);

// Server Action counterpart to lib/nations.ts's requireNationsId — throws
// instead of returning null, for use inside "use server" actions.
export async function requireActiveNationsId(user: User | null | undefined): Promise<string> {
  const nationsId = await getActiveNationsId(user);
  if (!nationsId) {
    throw new Error("Ditt konto saknar en nationsID. Kontakta administratören.");
  }
  return nationsId;
}

// Page-level counterpart — redirects instead of throwing, same shape as
// lib/nations.ts's requireNationsIdOrRedirect.
export async function requireActiveNationsIdOrRedirect(user: User | null | undefined): Promise<string> {
  const nationsId = await getActiveNationsId(user);
  if (!nationsId) {
    redirect("/nationsid-saknas");
  }
  return nationsId;
}

// Called by the nation switcher (NavBar) via a thin Server Action wrapper.
// Validates the requested nation is actually one of the user's own before
// setting the cookie — never trusts client input for which nation to
// switch into, even though it's just a UI convenience cookie, not itself an
// authorization boundary (every read of nationsId is still re-derived from
// this same validated path, never from client-supplied state directly).
export async function setActiveNation(user: User | null | undefined, nationsId: string): Promise<void> {
  const available = getAvailableNations(user);
  if (!available.includes(nationsId)) {
    throw new Error("Otillåten nation.");
  }
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_NATION_COOKIE, nationsId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
