import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { ROLES } from "@/lib/roles";

export type AppUser = { sub: string; name: string; email: string };
export type AppRole = { id: string; name: string };

// ponytail: per-process in-memory cache — reset on cold start, not shared
// across serverless instances. Fine at nation-directory scale (tens of
// users); move to a shared cache (e.g. Redis) if instance count/traffic
// makes repeated cold-cache API calls a problem.
const USERS_CACHE_TTL_MS = 5 * 60 * 1000;
const usersCache = new Map<string, { users: AppUser[]; expiresAt: number }>();

function userLabel(firstName: string | null, lastName: string | null, fallback: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || fallback;
}

// Clerk Organizations don't natively carry this app's nationsId — it's
// matched via each org's public_metadata.nationsId (set by
// findOrCreateNationOrg below, read as a session claim everywhere else —
// see lib/active-nation.ts). Orgs are few (one per real nation), so listing
// and filtering in JS beats trying to search by metadata: Clerk's org list
// `query` param only matches id/name/slug, not metadata.
async function findNationOrg(nationsId: string) {
  const clerk = await clerkClient();
  const { data } = await clerk.organizations.getOrganizationList({ limit: 100 });
  return data.find((org) => org.publicMetadata?.nationsId === nationsId) ?? null;
}

// Read-write counterpart to findNationOrg — creates the org if none exists
// yet. Called from lib/nation-settings.ts's createNation (which also
// upserts the Postgres nations row) and from assignNationsId below; never
// called from a read-only list path.
export async function findOrCreateNationOrg(nationsId: string): Promise<string> {
  const existing = await findNationOrg(nationsId);
  if (existing) return existing.id;
  const clerk = await clerkClient();
  const created = await clerk.organizations.createOrganization({
    name: nationsId,
    publicMetadata: { nationsId },
  });
  return created.id;
}

// The nation's Clerk Organization is the source of truth for "everyone in
// this nation" — queried live via the Backend API instead of mirrored into
// Postgres, so the list is complete (not just people who've logged into
// this app) and stays in sync automatically as memberships change. Cached
// in memory briefly since the Backend API has its own per-instance rate
// limit.
export async function getUsersInNation(nationsId: string): Promise<AppUser[]> {
  const cached = usersCache.get(nationsId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.users;
  }

  const org = await findNationOrg(nationsId);
  if (!org) return [];

  const clerk = await clerkClient();
  const { data } = await clerk.organizations.getOrganizationMembershipList({
    organizationId: org.id,
    limit: 500,
  });
  const users = data
    .map((membership) => {
      const publicUserData = membership.publicUserData;
      if (!publicUserData) return null;
      return {
        sub: publicUserData.userId,
        name: userLabel(publicUserData.firstName, publicUserData.lastName, publicUserData.identifier),
        email: publicUserData.identifier,
      };
    })
    .filter((user): user is AppUser => user !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));

  usersCache.set(nationsId, { users, expiresAt: Date.now() + USERS_CACHE_TTL_MS });
  return users;
}

// Every user in the tenant necessarily signed up through this app, so
// "logged in but missing a nationsID" is just every Clerk user with zero
// Organization memberships. Clerk has no direct "users not in any org"
// filter, so this collects every user who IS a member of some org (across
// all orgs) and subtracts that set from the full user list — fine at this
// app's real scale (a handful of nations, not thousands of users). Not
// cached: this is only read from the low-traffic admin page, and staleness
// here risks the admin assigning a nation to someone already assigned.
export async function getUsersWithoutNation(): Promise<AppUser[]> {
  const clerk = await clerkClient();
  const { data: orgs } = await clerk.organizations.getOrganizationList({ limit: 100 });

  const memberIds = new Set<string>();
  for (const org of orgs) {
    const { data: memberships } = await clerk.organizations.getOrganizationMembershipList({
      organizationId: org.id,
      limit: 500,
    });
    for (const membership of memberships) {
      if (membership.publicUserData) memberIds.add(membership.publicUserData.userId);
    }
  }

  const { data: users } = await clerk.users.getUserList({ limit: 500 });
  return users
    .filter((user) => !memberIds.has(user.id))
    .map((user) => {
      const email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        "";
      return { sub: user.id, name: userLabel(user.firstName, user.lastName, email), email };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));
}

export async function assignNationsId(sub: string, nationsId: string): Promise<void> {
  const orgId = await findOrCreateNationOrg(nationsId);
  const clerk = await clerkClient();
  await clerk.organizations.createOrganizationMembership({
    organizationId: orgId,
    userId: sub,
    role: "org:member",
  });
  usersCache.delete(nationsId);
}

// Permanently removes the Clerk account — for pruning irrelevant/bogus join
// requests out of the "users without a nation" list, not for offboarding a
// real assigned user.
export async function deleteUser(sub: string): Promise<void> {
  const clerk = await clerkClient();
  await clerk.users.deleteUser(sub);
}

// Roles now live in this app's own hardcoded catalog (lib/roles.ts's
// ROLES) as a plain publicMetadata.roles array on the user, not an
// external RBAC system the way Auth0's Roles feature was — see
// docs/DECISIONS.md. Deliberately NOT using Clerk's Organization custom
// roles for this: roles here are a per-user grant, not per-org-membership,
// and custom org roles need the paid B2B Authentication add-on past
// Clerk's two free defaults (org:admin/org:member).
export async function getAvailableRoles(): Promise<AppRole[]> {
  return Object.values(ROLES).map((role) => ({ id: role, name: role }));
}

// updateUserMetadata deep-merges (unlike replaceUserMetadata), so this
// overwrites only the roles key — any other publicMetadata the user has
// survives untouched.
export async function assignRoles(sub: string, roleIds: string[]): Promise<void> {
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(sub, { publicMetadata: { roles: roleIds } });
}
