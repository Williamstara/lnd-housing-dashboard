import "server-only";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

// Clerk migration: Clerk is now registered as a Third-Party Auth issuer for
// Supabase (replacing Auth0 — see docs/DECISIONS.md), so Clerk's default
// session token is forwarded as the bearer token on every Supabase request
// instead of a Supabase-native session. Roles/login still run through Auth0
// until the rest of this migration lands (see lib/auth0.ts, lib/roles.ts) —
// this file only owns the token Supabase itself sees.
//
// Deliberately uses the plain @supabase/supabase-js createClient, NOT
// @supabase/ssr's createServerClient: that wrapper unconditionally calls
// `client.auth.onAuthStateChange(...)` internally to sync a Supabase-native
// session to cookies — but `accessToken` mode makes `.auth` a throwing proxy
// (by design: an external token means Supabase's own auth flow shouldn't be
// touched at all), so createServerClient crashes at construction time. Its
// whole value is that cookie-sync machinery, which doesn't apply here —
// Clerk owns the only session that exists — so @supabase/ssr isn't needed
// for this server-only path.
//
// Created fresh per request/Server Action, not cached module-scope: the
// Clerk session lives in a request-scoped context, not global state, so
// there's no single long-lived client to cache. Cheap — this wraps `fetch`,
// not a persistent connection.
//
// IMPORTANT — Clerk-side prerequisite, not visible from this file: the
// Clerk instance's session token is customized (Dashboard-equivalent:
// `clerk config patch` on `session.claims`) to add a plain, non-namespaced
// `role: "authenticated"` claim, unrelated to the app's own roles system.
// PostgREST reads this exact claim to decide which Postgres role to execute
// a request as; without it, every request from a real, valid Clerk token is
// silently treated as the `anon` Postgres role (not an error — it just
// quietly returns empty/denied results, indistinguishable from an
// unauthenticated request). Same failure mode Auth0 had — confirmed via a
// live end-to-end check (anon gets a hard 401, this doesn't) before trusting
// it. `nations_id` is the same session.claims customization, sourced from
// the active organization's public_metadata.
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => {
        const { getToken } = await auth();
        return await getToken();
      },
    }
  );
}

// Shared chunk size for bulk-import writes (bulkUpsert* in lib/apartments.ts,
// besiktningar.ts, andrahandsgaster.ts, tenants.ts, rentalobjects.ts): batch
// N rows per insert/upsert call instead of one round trip per row, so a
// clean N-row import costs ceil(N/50) requests instead of N.
export const BULK_WRITE_CHUNK_SIZE = 50;

export function chunkArray<T>(items: T[], size: number = BULK_WRITE_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
