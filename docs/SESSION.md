# Current session / milestone

This file holds the current milestone's working memory. Replace it when the
milestone changes; durable reasoning belongs in `docs/DECISIONS.md`.

## Current milestone

**Complete, live-verified in a real browser.** Post-Clerk-migration follow-up:
added a real public landing page at `/` for signed-out visitors (explains the
app, "Logga in" CTA), since the prior state simply redirected `/` straight
into Clerk's `/sign-in` widget rendered inside the full dashboard chrome
(NavBar sidebar) — the user described this as "still a skeleton page of the
app". See `docs/DECISIONS.md`'s "Public landing page" entry for the layout
approach and why `NavBar` had to move out of the always-on root layout.

## Previous milestone

**Complete (implementation + live-verified in a real browser, not just
statically).** Migrated authentication off Auth0 onto Clerk — user-initiated
(future per-MAU pricing, and Clerk Organizations map naturally onto this
app's per-`nationsID` multi-tenant model). This is a separate, later
milestone from the SaaS-readiness and Mongo→Supabase milestones summarized
below; see `docs/DECISIONS.md`'s "Auth0 → Clerk migration" entry for the
full reasoning behind every non-obvious call made this session.

## User problem being solved

The user wanted to move off Auth0 before this repo (and a second, related
repo with the same nationID-per-tenant shape) grows past the point where
Auth0's steeper per-user overage pricing starts to matter, and to adopt
Clerk Organizations as a cleaner fit for the existing multi-tenant model
than the hand-rolled Auth0-claim approach. This repo was the deliberate
pilot — explicitly the smaller of the two apps by user count.

## Implemented scope (6 phases, all complete)

1. **Phase 1 — Install & verify Clerk standalone.** `clerk init` scaffolded
   `@clerk/nextjs`; `clerk init`'s own edits to `app/layout.tsx` (mangled
   indentation) and the scaffolded sign-in/sign-up pages (Tailwind classes,
   against this repo's MUI-only convention) were hand-reconciled rather
   than accepted as-is. Verified via a real `/sign-up` render in the
   browser before proceeding.
2. **Phase 2 — Org/tenant model.** Nations map to Clerk Organizations via
   `public_metadata.nationsId`; `nations_id` exposed as a session-token
   claim. `lib/supabase-server.ts` switched Supabase's Third-Party Auth
   bearer token from Auth0's ID token to Clerk's session token. New RLS
   migration (`20260814020000_clerk_claims.sql`) re-pointing every
   tenant-isolation policy's claim path. Verified end-to-end with a real
   Clerk token against the live Supabase REST API (correct row returned,
   not an empty/anon-fallback result) before trusting it.
3. **Phase 3 — Roles.** `roles` exposed as a session-token claim from
   `user.publicMetadata.roles`. `lib/roles.ts` rewritten to pure
   `string[]`-based checks (provider-agnostic, still client-importable).
4. **Phase 4 — Admin tooling.** `lib/app-users.ts` fully rewritten against
   Clerk's Backend SDK (was Auth0's Management API) — verified against the
   live Clerk API via a throwaway script (deleted after) before trusting
   it, not just type-checked.
5. **Phase 5 — Auth0 removal.** `@auth0/nextjs-auth0` uninstalled,
   `lib/auth0.ts` deleted, all 15 protected pages converted from
   `auth0.withPageAuthRequired` to Clerk's `await auth.protect()`.
   Live-verified in a real browser: home page, `/admin` (both tabs),
   `/besiktningar` (55 real rows through the full Clerk→RLS→Supabase
   chain) — zero console errors.
6. **Phase 6 — Deprecation fix + data migration.** Mid-session, Clerk
   flagged `createRouteMatcher`-in-middleware as deprecated (security
   reasoning: middleware can be bypassed at the framework level; Server
   Actions are invoked by ID, not path). Migrated to the current
   resource-based pattern (`auth.protect()` moved into every page;
   `proxy.ts` kept only for session syncing + non-auth UX redirects) —
   confirmed via the actual migration guide fetched live, not memory.
   Data-migration check: `gmail_tokens` had zero rows for the real user
   (nothing to re-key); `todos.tilldelad_till` had 3 rows pointing at a
   different, not-yet-Clerk-signed-up person — left as-is per the user's
   explicit decision.

## Validation status

- `npx tsc --noEmit`: clean after every phase.
- `npm run lint`: at (and briefly better than) the documented baseline
  throughout — 7 pre-existing `react-hooks/set-state-in-effect` errors, 0
  warnings (the old `lib/auth0.ts` unused-arg warning is gone, that file no
  longer exists).
- Live-verified repeatedly in a real Chrome browser via `claude-in-chrome`,
  not just curl/tsc: real sign-up, real sign-in, home page, `/admin` (both
  tabs), `/besiktningar` (real data), `/mallar` (the `RequireSignedIn`
  client-wrapper path). Console checked for errors at each step.
- Three real bugs found and fixed mid-migration, not just "it compiled":
  (1) a JWT-template vs. session-claims mistake, self-corrected before
  relying on it; (2) `proxy.ts` blocking `/sign-in`/`/sign-up` themselves
  (lockout, since nationsID now depends on having a Clerk session);
  (3) the `createRouteMatcher` deprecation.
- One pre-existing, unrelated bug found and flagged, not fixed this
  session: `service_role` missing `SELECT` grants on `gmail_tokens`/
  `todos` — see `docs/TODO.md`.

## Acceptance criteria

- [x] Phase 1 — Clerk installed, independently verified.
- [x] Phase 2 — org/tenant model, RLS bridge, live-verified against
      Supabase.
- [x] Phase 3 — roles ported, pure/provider-agnostic.
- [x] Phase 4 — admin tooling rewritten, live-verified against Clerk.
- [x] Phase 5 — Auth0 fully removed, live-verified in a real browser.
- [x] Phase 6 — deprecation warning resolved via Clerk's current
      documented pattern; data-migration check complete (nothing to
      migrate; one item deliberately deferred per user decision).
- [x] `npx tsc --noEmit` and `npm run lint` clean against baseline,
      verified after every phase.

## Out-of-milestone notes

- The Clerk-side setup (org creation, session-claims config, JWT-template
  cleanup, role/nationsId metadata) was done via the `clerk` CLI
  (`npx clerk ...`, global install failed on this machine due to npm
  permissions — `npx` worked fine as the fallback), with `--dry-run`
  previewed before every mutation against the live Clerk app.
- `npm uninstall` while the dev server was still running left Turbopack's
  module cache in a bad state (one cold 404 on `/`) — resolved by killing
  the server, clearing `.next/`, and restarting clean. Not a code bug;
  avoid uninstalling packages with a dev server live in future sessions.

---

# Previous milestones (earlier sessions, summarized)

- **SaaS-readiness configuration infrastructure** (2026-08-13) — per-nation
  permission model, multi-nation operator support (the array-shaped-claim
  half was never exercised and was later deleted during the Clerk
  migration above), feature flags, admin column config extended to 5 more
  tables, currency/locale settings (scoped), Excel cell-parser
  consolidation (scoped). Full detail in git history; durable decisions in
  `docs/DECISIONS.md`.
- **Auth0/Supabase performance audit** (2026-08-13) — `getCachedSession()`
  request-level caching (the caching *pattern* carried forward into
  `lib/active-nation.ts`'s Clerk-based equivalents above; the Auth0-specific
  function itself is gone), bulk-import write batching, an apartments-importer
  N+1 fix.
- **MongoDB → Supabase migration** (2026-08-12 to 2026-08-13) — full
  migration, documented in `docs/DECISIONS.md` and this repo's memory
  files. Its "Auth0 stays" decision is superseded by the Clerk migration
  above.
