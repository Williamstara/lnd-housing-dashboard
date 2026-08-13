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

// Every distinct role-gated action in the app (docs/SAAS-READINESS-ROADMAP.md
// Tier 2.1's catalog, deduplicated — several actions.ts files independently
// defined the same check under different function names). Deliberately
// excludes "admin.manage" — admin is a cross-nation superuser (see hasRole's
// bypass above), not something a nation should be able to configure for
// itself; app/admin/actions.ts's requireAdmin stays hardcoded to
// ROLES.ADMIN, not routed through this permission table.
export const PERMISSIONS = {
  BESIKTNINGAR_MARK_PAYMENT: "besiktningar.mark_payment",
  BESIKTNINGAR_DELETE: "besiktningar.delete",
  BESIKTNINGAR_ARCHIVE: "besiktningar.archive",
  FASTIGHETER_MANAGE: "fastigheter.manage",
  STATISTIK_MANAGE_MISSED_RENT: "statistik.manage_missed_rent",
  UPPSAGNING_CREATE: "uppsagning.create",
  LEDIGA_LAGENHETER_MANAGE_TENANT: "lediga_lagenheter.manage_tenant",
  LEDIGA_LAGENHETER_MANAGE_FASTIGHET: "lediga_lagenheter.manage_fastighet",
  LEDIGA_LAGENHETER_ARCHIVE: "lediga_lagenheter.archive",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// A human label per key, for the admin permissions editor — kept next to
// PERMISSIONS so a new key can't be added to one list without the other.
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  [PERMISSIONS.BESIKTNINGAR_MARK_PAYMENT]: "Besiktningar: markera betalning",
  [PERMISSIONS.BESIKTNINGAR_DELETE]: "Besiktningar: ta bort",
  [PERMISSIONS.BESIKTNINGAR_ARCHIVE]: "Besiktningar: arkivera",
  [PERMISSIONS.FASTIGHETER_MANAGE]: "Fastigheter: hantera",
  [PERMISSIONS.STATISTIK_MANAGE_MISSED_RENT]: "Statistik: hantera missade hyror",
  [PERMISSIONS.UPPSAGNING_CREATE]: "Uppsägning: skapa",
  [PERMISSIONS.LEDIGA_LAGENHETER_MANAGE_TENANT]: "Lediga lägenheter: hantera hyresgäst",
  [PERMISSIONS.LEDIGA_LAGENHETER_MANAGE_FASTIGHET]: "Lediga lägenheter: hantera fastighet",
  [PERMISSIONS.LEDIGA_LAGENHETER_ARCHIVE]: "Lediga lägenheter: arkivera",
};

// LND's exact current hardcoded behavior, preserved as the fallback a
// nation with no saved nation_role_permissions rows gets — same "saved ??
// default" pattern as resolveColumns/resolveImportMapping
// (lib/table-columns.ts). Admin always passes regardless (hasAnyRole ->
// hasRole's superuser bypass), so it's never listed explicitly here.
export const DEFAULT_PERMISSION_ROLES: Record<PermissionKey, string[]> = {
  [PERMISSIONS.BESIKTNINGAR_MARK_PAYMENT]: [ROLES.HUSVD, ROLES.EKONOMI],
  [PERMISSIONS.BESIKTNINGAR_DELETE]: ARCHIVE_ROLES,
  [PERMISSIONS.BESIKTNINGAR_ARCHIVE]: [ROLES.HUSVD],
  [PERMISSIONS.FASTIGHETER_MANAGE]: [ROLES.HUSFORMAN],
  [PERMISSIONS.STATISTIK_MANAGE_MISSED_RENT]: [ROLES.HUSFORMAN],
  [PERMISSIONS.UPPSAGNING_CREATE]: [ROLES.EKONOMI],
  [PERMISSIONS.LEDIGA_LAGENHETER_MANAGE_TENANT]: [ROLES.EKONOMI],
  [PERMISSIONS.LEDIGA_LAGENHETER_MANAGE_FASTIGHET]: [ROLES.HUSFORMAN],
  [PERMISSIONS.LEDIGA_LAGENHETER_ARCHIVE]: ARCHIVE_ROLES,
};

// Pure check — takes the nation's saved role list for this permission (or
// null/empty to use the default) so this file stays DB-free and importable
// client-side. lib/permissions.ts composes this with the actual Supabase
// fetch + session read for use in Server Actions.
export function hasPermission(
  user: User | null | undefined,
  permissionKey: PermissionKey,
  savedRoles: string[] | null | undefined
): boolean {
  const allowedRoles = savedRoles && savedRoles.length > 0 ? savedRoles : DEFAULT_PERMISSION_ROLES[permissionKey];
  return hasAnyRole(user, allowedRoles);
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
