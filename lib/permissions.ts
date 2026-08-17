import "server-only";
import { cache } from "react";
import { getCurrentUserDisplayName, getCurrentUserId, getSessionRoles, requireActiveNationsId } from "@/lib/active-nation";
import { getNationRolePermissions } from "@/lib/nation-settings";
import { hasPermission, type PermissionKey } from "@/lib/roles";

// Cached per request — an action gated by more than one permission check
// (or that also needs nationsId elsewhere) reuses the same fetch instead of
// re-querying nation_role_permissions each time. Same pattern as
// lib/active-nation.ts's getActiveNationsId.
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
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");
  const nationsId = await requireActiveNationsId();
  const roles = await getSessionRoles();
  const saved = await getCachedNationPermissions(nationsId);
  if (!hasPermission(roles, permissionKey, saved[permissionKey])) {
    throw new Error(errorMessage);
  }
  return { nationsId, userName: await getCurrentUserDisplayName() };
}
