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
} as const;

export function getUserRoles(user: User | null | undefined): string[] {
  if (!user) return [];
  const roles = user[ROLES_CLAIM];
  const result = Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : [];
  console.log("[roles debug]", {
    sub: user.sub,
    claimKey: ROLES_CLAIM,
    rawClaimValue: roles,
    resolvedRoles: result,
    userKeys: Object.keys(user),
  });
  return result;
}

export function hasRole(
  user: User | null | undefined,
  role: string
): boolean {
  return getUserRoles(user).includes(role);
}
