import "server-only";

export type AppUser = { sub: string; name: string; email: string };
export type AppRole = { id: string; name: string };

const USERS_CACHE_TTL_MS = 5 * 60 * 1000;

// ponytail: per-process in-memory caches — reset on cold start, not shared
// across serverless instances. Fine at nation-directory scale (tens of
// users); move to a shared cache (e.g. Redis) if instance count/traffic
// makes repeated cold-cache Management API calls a problem.
let tokenCache: { token: string; expiresAt: number } | null = null;
const usersCache = new Map<string, { users: AppUser[]; expiresAt: number }>();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

async function throwForResponse(response: Response, action: string): Promise<never> {
  const body = await response.text().catch(() => "");
  throw new Error(`${action}: ${response.status}${body ? ` — ${body}` : ""}`);
}

async function getManagementToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const domain = requireEnv("AUTH0_DOMAIN");
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: requireEnv("AUTH0_M2M_CLIENT_ID"),
      client_secret: requireEnv("AUTH0_M2M_CLIENT_SECRET"),
      audience: `https://${domain}/api/v2/`,
    }),
  });
  if (!response.ok) {
    await throwForResponse(response, "Failed to get Auth0 Management API token");
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early rather than risking a request that races the
  // token's real expiry.
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

// Auth0 is the source of truth for "everyone in this nation" — queried live
// via the Management API instead of mirrored into Mongo, so the list is
// complete (not just people who've logged into this app) and doesn't add to
// the Mongo bill. Cached in memory for a few minutes since the Management
// API has its own per-tenant rate limit.
export async function getUsersInNation(nationsId: string): Promise<AppUser[]> {
  const cached = usersCache.get(nationsId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.users;
  }

  const domain = requireEnv("AUTH0_DOMAIN");
  const token = await getManagementToken();
  const url = new URL(`https://${domain}/api/v2/users`);
  url.searchParams.set("q", `app_metadata.nationsID:"${nationsId.replace(/"/g, '\\"')}"`);
  url.searchParams.set("search_engine", "v3");
  url.searchParams.set("fields", "user_id,name,email");
  url.searchParams.set("include_fields", "true");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    await throwForResponse(response, "Failed to fetch users from Auth0");
  }

  const data = (await response.json()) as Array<{ user_id: string; name?: string; email?: string }>;
  const users = data
    .map((u) => ({ sub: u.user_id, name: u.name ?? u.email ?? u.user_id, email: u.email ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));

  usersCache.set(nationsId, { users, expiresAt: Date.now() + USERS_CACHE_TTL_MS });
  return users;
}

// Every user in the tenant necessarily signed up through this app, so
// "logged in but missing a nationsID" is just every Auth0 user with no
// app_metadata.nationsID — no separate login-tracking needed. Not cached:
// this is only read from the low-traffic admin page, and staleness here
// risks the admin assigning a nation to someone already assigned.
export async function getUsersWithoutNation(): Promise<AppUser[]> {
  const domain = requireEnv("AUTH0_DOMAIN");
  const token = await getManagementToken();
  const url = new URL(`https://${domain}/api/v2/users`);
  url.searchParams.set("q", "NOT _exists_:app_metadata.nationsID");
  url.searchParams.set("search_engine", "v3");
  url.searchParams.set("fields", "user_id,name,email");
  url.searchParams.set("include_fields", "true");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    await throwForResponse(response, "Failed to fetch users from Auth0");
  }

  const data = (await response.json()) as Array<{ user_id: string; name?: string; email?: string }>;
  return data
    .map((u) => ({ sub: u.user_id, name: u.name ?? u.email ?? u.user_id, email: u.email ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));
}

export async function assignNationsId(sub: string, nationsId: string): Promise<void> {
  const domain = requireEnv("AUTH0_DOMAIN");
  const token = await getManagementToken();
  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ app_metadata: { nationsID: nationsId } }),
  });
  if (!response.ok) {
    await throwForResponse(response, "Failed to assign nationsID");
  }
  usersCache.delete(nationsId);
}

// Permanently removes the Auth0 account — for pruning irrelevant/bogus join
// requests out of the "users without a nation" list, not for offboarding a
// real assigned user.
export async function deleteUser(sub: string): Promise<void> {
  const domain = requireEnv("AUTH0_DOMAIN");
  const token = await getManagementToken();
  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    await throwForResponse(response, "Failed to delete user");
  }
}

// Roles live in Auth0's own RBAC feature (Dashboard > User Management >
// Roles), separate from app_metadata — a role's *name* is what ends up in
// the "https://lnd-housing-dashboard/roles" ID token claim (see lib/roles.ts
// and hasRole()), but assigning one to a user needs its role_id.
export async function getAvailableRoles(): Promise<AppRole[]> {
  const domain = requireEnv("AUTH0_DOMAIN");
  const token = await getManagementToken();
  const url = new URL(`https://${domain}/api/v2/roles`);
  url.searchParams.set("per_page", "100");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    await throwForResponse(response, "Failed to fetch roles from Auth0");
  }

  const data = (await response.json()) as Array<{ id: string; name: string }>;
  return data
    .map((r) => ({ id: r.id, name: r.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));
}

export async function assignRoles(sub: string, roleIds: string[]): Promise<void> {
  const domain = requireEnv("AUTH0_DOMAIN");
  const token = await getManagementToken();
  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}/roles`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ roles: roleIds }),
  });
  if (!response.ok) {
    await throwForResponse(response, "Failed to assign roles");
  }
}
