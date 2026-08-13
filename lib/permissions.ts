import "server-only";
import { cache } from "react";
import { getCachedSession } from "@/lib/auth0";
import { requireActiveNationsId } from "@/lib/active-nation";
import { getNationRolePermissions } from "@/lib/nation-settings";
import { getUserDisplayName, hasPermission, type PermissionKey } from "@/lib/roles";

// Cached per request — an action gated by more than one permission check
// (or that also needs nationsId elsewhere) reuses the same fetch instead of
// re-querying nation_role_permissions each time. Same pattern as
// lib/auth0.ts's getCachedSession.
const getCachedNationPermissions = cache((nationsId: string) => getNationRolePermissions(nationsId));

// The single shared guard every app/*/actions.ts should use for a
// role-gated Server Action — replaces the ~10 independently hand-written
// requireXRole() functions the app had before (docs/SAAS-READINESS-ROADMAP.md
// Tier 2.1). Resolves the caller's nationsId from the session (never trusts
// client input, per this app's established convention), checks the
// permission against that nation's saved role mapping (or the hardcoded
// default if none is saved), and throws errorMessage on failure.
export async function requirePermission(
  permissionKey: PermissionKey,
  errorMessage: string
): Promise<{ nationsId: string; userName: string }> {
  const session = await getCachedSession();
  if (!session?.user) throw new Error("Unauthorized");
  const nationsId = await requireActiveNationsId(session.user);
  const saved = await getCachedNationPermissions(nationsId);
  if (!hasPermission(session.user, permissionKey, saved[permissionKey])) {
    throw new Error(errorMessage);
  }
  return { nationsId, userName: getUserDisplayName(session.user) };
}
