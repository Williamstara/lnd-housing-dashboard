import { redirect } from "next/navigation";
import type { User } from "@auth0/nextjs-auth0/types";

// Auth0 doesn't put custom roles on the session by default — an Auth0
// Action (Dashboard > Actions > Flows > Login) has to add them to the ID
// token as a custom claim, e.g.:
//
//   exports.onExecutePostLogin = async (event, api) => {
//     const roles = event.authorization?.roles ?? [];
//     api.idToken.setCustomClaim("https://lnd-housing-dashboard/roles", roles);
//   };
//
// If your Action uses a different claim name, update ROLES_CLAIM below to
// match. This file has no "server-only" import since NavBar reads it
// client-side too.
export const ROLES_CLAIM = "https://lnd-housing-dashboard/roles";

export const ROLES = {
  EKONOMI: "ekonomi",
  ADMIN: "admin",
  HUSVD: "husvd",
  HUSFORMAN: "husforman",
  VAKTMASTARE: "vaktmastare",
} as const;

// Shared by every "archive" action (Redo för kontrakt, Besiktningar, ...) —
// keep them all pointed at this one list rather than repeating it.
export const ARCHIVE_ROLES: string[] = [ROLES.EKONOMI, ROLES.HUSVD, ROLES.ADMIN];

export function getUserRoles(user: User | null | undefined): string[] {
  if (!user) return [];
  const roles = user[ROLES_CLAIM];
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : [];
}

// Admin is a superuser: it satisfies every role check, not just its own —
// this is how a single "admin" grant gives access to everything else too.
export function hasRole(
  user: User | null | undefined,
  role: string
): boolean {
  const roles = getUserRoles(user);
  return roles.includes(role) || roles.includes(ROLES.ADMIN);
}

export function hasAnyRole(
  user: User | null | undefined,
  roles: string[]
): boolean {
  return roles.some((role) => hasRole(user, role));
}

// vaktmästare is the one role that *narrows* access instead of adding to
// it — a user whose only role is vaktmästare gets nothing but the todo
// list (enforced in proxy.ts, and reflected in the nav in NavBar/NavGrid).
// Holding any other role alongside it means normal full access applies
// instead; this deliberately reads the raw roles claim rather than going
// through hasRole(), so admin's superuser bypass doesn't apply here.
export function isRestrictedToTodo(user: User | null | undefined): boolean {
  const roles = getUserRoles(user);
  return roles.length > 0 && roles.every((role) => role === ROLES.VAKTMASTARE);
}

// Page-level counterpart to requireNationsIdOrRedirect in lib/nations.ts —
// the admin page shows cross-nation data, so anyone without the admin role
// gets bounced rather than seeing it.
export function requireAdminOrRedirect(user: User | null | undefined): void {
  if (!hasRole(user, ROLES.ADMIN)) {
    redirect("/");
  }
}

// Human-readable identifier for audit trails (e.g. "who pressed this
// button") — prefers name, then falls back to something always present.
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return "Okänd användare";
  if (typeof user.name === "string" && user.name) return user.name;
  if (typeof user.email === "string" && user.email) return user.email;
  return user.sub ?? "Okänd användare";
}
