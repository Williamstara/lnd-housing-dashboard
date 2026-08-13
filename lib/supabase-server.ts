import "server-only";
import { createClient } from "@supabase/supabase-js";
import { auth0 } from "@/lib/auth0";

// Auth0 stays the identity/roles/tenant system of record — Supabase is
// registered as a Third-Party Auth issuer for Auth0, so the Auth0 ID token
// (already sitting unused in the Auth0 session, see lib/auth0.ts) is forwarded
// as the bearer token on every Supabase request instead of a Supabase-native
// session.
//
// Deliberately uses the plain @supabase/supabase-js createClient, NOT
// @supabase/ssr's createServerClient: that wrapper unconditionally calls
// `client.auth.onAuthStateChange(...)` internally to sync a Supabase-native
// session to cookies — but `accessToken` mode makes `.auth` a throwing proxy
// (by design: an external token means Supabase's own auth flow shouldn't be
// touched at all), so createServerClient crashes at construction time. Its
// whole value is that cookie-sync machinery, which doesn't apply here — Auth0
// owns the only session that exists — so @supabase/ssr isn't needed for this
// server-only path.
//
// Created fresh per request/Server Action, not cached module-scope: the
// Auth0 session lives in an encrypted request cookie, not global state, so
// there's no single long-lived client to cache. Cheap — this wraps `fetch`,
// not a persistent connection.
//
// IMPORTANT — Auth0-side prerequisite, not visible from this file: the same
// Auth0 Post-Login Action that sets the app's own namespaced
// nationsID/roles claims (see lib/nations.ts, lib/roles.ts) must ALSO call
// `api.idToken.setCustomClaim('role', 'authenticated')` — a plain,
// non-namespaced claim, unrelated to the app's own roles system. PostgREST
// reads this exact claim to decide which Postgres role to execute a request
// as; without it, every request from a real, valid, correctly-issued Auth0
// token is silently treated as the `anon` Postgres role (not an error — it
// just quietly returns empty/denied results, indistinguishable from an
// unauthenticated request). Confirmed the hard way during the Supabase
// migration's Phase 2 proof of concept. This Action lives only in the Auth0
// dashboard, not version-controlled in this repo.
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => {
        const session = await auth0.getSession();
        return session?.tokenSet.idToken ?? null;
      },
    }
  );
}
