import "server-only";

export type AppUser = { sub: string; name: string; email: string };

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
    throw new Error(`Failed to get Auth0 Management API token: ${response.status}`);
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
    throw new Error(`Failed to fetch users from Auth0: ${response.status}`);
  }

  const data = (await response.json()) as Array<{ user_id: string; name?: string; email?: string }>;
  const users = data
    .map((u) => ({ sub: u.user_id, name: u.name ?? u.email ?? u.user_id, email: u.email ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));

  usersCache.set(nationsId, { users, expiresAt: Date.now() + USERS_CACHE_TTL_MS });
  return users;
}
