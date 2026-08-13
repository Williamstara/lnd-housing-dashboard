import { redirect } from "next/navigation";
import type { User } from "@auth0/nextjs-auth0/types";

// Mirrors ROLES_CLAIM in lib/roles.ts — an Auth0 Action (Dashboard > Actions >
// Flows > Login) has to add this to the ID token as a custom claim, e.g.:
//
//   exports.onExecutePostLogin = async (event, api) => {
//     api.idToken.setCustomClaim(
//       "https://lnd-housing-dashboard/nationsID",
//       event.user.app_metadata?.nationsID
//     );
//   };
//
// Every database read/write in this app is scoped to the caller's nationsID
// so multiple student nations can share one deployment without seeing each
// other's data. If your Action uses a different claim name, update
// NATIONS_ID_CLAIM below to match.
export const NATIONS_ID_CLAIM = "https://lnd-housing-dashboard/nationsID";

export function getNationsId(user: User | null | undefined): string | null {
  const value = user?.[NATIONS_ID_CLAIM];
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value) && typeof value[0] === "string" && value[0]) return value[0];
  return null;
}

// A user with more than one nation (the Action sets nationsID as an array
// instead of a string — for an operator managing multiple real customers,
// not the common case) gets every one of them here; a single-nation user
// (everyone today) gets a one-element array. lib/active-nation.ts uses this
// to resolve which one is currently "active" for a multi-nation user;
// getNationsId above stays a plain, synchronous, client-safe read (first
// available nation) for every call site that doesn't need switching.
export function getAvailableNations(user: User | null | undefined): string[] {
  const value = user?.[NATIONS_ID_CLAIM];
  if (typeof value === "string" && value) return [value];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  return [];
}

// Throws rather than silently scoping to nothing/everything — a user without
// a nationsID claim must not be able to read or write any tenant's data.
// Used in Server Actions and Route Handlers, where a thrown error is caught
// and surfaced as an in-place error message rather than a page navigation.
export function requireNationsId(user: User | null | undefined): string {
  const id = getNationsId(user);
  if (!id) {
    throw new Error("Ditt konto saknar en nationsID. Kontakta administratören.");
  }
  return id;
}

// Page-level counterpart to requireNationsId. proxy.ts already blocks any
// authenticated request without a nationsID before it reaches a page, so
// this is defense-in-depth: if it's ever hit anyway, redirect to a clean
// explanation page instead of throwing (which would render Next's generic
// error screen).
export function requireNationsIdOrRedirect(user: User | null | undefined): string {
  const id = getNationsId(user);
  if (!id) {
    redirect("/nationsid-saknas");
  }
  return id;
}
