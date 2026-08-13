# Current session / milestone

This file holds the current milestone's working memory. Replace it when the
milestone changes; durable reasoning belongs in `docs/DECISIONS.md`.

## Current milestone

**Complete (implementation + static verification).** Full implementation of
`docs/SAAS-READINESS-ROADMAP.md`'s "configuration infrastructure" scope,
following a plan-mode session that re-audited the roadmap with `graphify`
and then discussed scope directly with the user (see
`docs/DECISIONS.md`'s "SaaS-readiness roadmap: build configuration
infrastructure now, defer the two biggest architectural bets" entry for the
full reasoning). This is a separate, later milestone from the previous
Auth0/Supabase performance-audit session (summarized below it in this same
file since they landed close together and share validation state).

## User problem being solved

Several real Swedish student nations are now interested in this app, beyond
`LND`. The user's explicit goal: as little as possible hardcoded between
nations, configured in the admin dashboard instead, with actual per-nation
workflow differences worked out through conversation with each nation
rather than guessed at in code. Two roadmap items (Tier 1.1 property
hierarchy, Tier 3.1 workflow state machine) were explicitly *not* built
this session for exactly that reason — see the DECISIONS.md entry above.

## Implemented scope (6 batches, all complete)

1. **Roadmap re-audit + doc updates.** Graphify-assisted sweep found two
   gaps: Tier 6.2's localization scope was undercounted ~7x (40 sites/18
   files, not "6+"), and a new Tier 3.4 (duplicated Excel cell-parsing
   helpers, already known in `docs/ARCHITECTURE.md` but never carried into
   the roadmap). Both added to `docs/SAAS-READINESS-ROADMAP.md`.
2. **Batch 1 — Role-guard cleanup + per-nation permission model** (Tier 2.1,
   all 3 steps). New `nation_role_permissions` table + RLS
   (`supabase/migrations/20260813140000_nation_role_permissions.sql`,
   applied). `lib/roles.ts` gained `PERMISSIONS`/`DEFAULT_PERMISSION_ROLES`/
   `hasPermission`; new `lib/permissions.ts`'s `requirePermission()`
   replaces the ~10 independently hand-written `requireXRole()` functions
   across `app/*/actions.ts`. New "Behörigheter" tab in `/admin`. A nation
   with no saved rows behaves exactly like `LND` does today (verified via
   the fallback logic).
3. **Batch 2 — Multi-nation support for the operator** (Tier 1.2).
   `lib/nations.ts`'s `getNationsId`/new `getAvailableNations` handle an
   array-shaped nationsID claim (backward-compatible — every user today has
   a string claim, unaffected). New `lib/active-nation.ts` (server-only,
   kept separate from `lib/nations.ts` specifically so `next/headers` never
   reaches `NavBar.tsx`'s client bundle) — cookie-backed active-nation
   resolution, always re-validated against the user's real claim. Nation
   switcher in `NavBar.tsx` (invisible until a real array claim exists — no
   Auth0 Action change has been made yet, that's external to this repo).
   Swept all 11 `page.tsx` files, every `actions.ts` guard, `lib/permissions.ts`,
   and all 9 `app/api/**/route.ts` handlers onto the active-nation-aware
   path.
4. **Batch 3 — Feature flags** (Tier 3.2 + 5.2's flag half + 7.1).
   `enabled_features` column on `nations`
   (`supabase/migrations/20260813150000_nation_features.sql`, applied).
   `FEATURES`/`isFeatureEnabled` in `lib/table-columns.ts`. Gates `/epost`+
   `/mallar` nav entries, the laundry-account buttons
   (`TenantsTable`/`AndrahandsgasterTable`), and the key-handover toggles
   (`ApartmentsTable`). New "Funktioner" tab in `/admin`.
5. **Batch 4 — Admin config coverage** (Tier 4.1 + 4.2). `TableKey` extended
   to `tenants`/`andrahandsgaster`/`arkiv`/`uppsagning`/`todo`, each with a
   `DEFAULT_*_COLUMNS` array and a `ColumnConfigEditor` instance (new
   `allowCustomFields` prop, off for these 5 since none of their row types
   has a `custom` bag). `ApartmentFormDialog`/`RentalObjectFormDialog` now
   respect the same column config (hidden fields disappear from the
   add/edit form too). **`TenantFormDialog`/`AndrahandsgastFormDialog`
   deliberately left unwired** — their server-side sanitizers blanket-require
   every field non-blank, so client-side field-hiding alone would make
   every save with a hidden field silently fail; needs the server check
   fixed too, tracked in `docs/TODO.md`.
6. **Batch 5 — Currency & locale** (Tier 6.1 + 6.2, scoped). `currency`/
   `locale` columns on `nations`
   (`supabase/migrations/20260813160000_nation_currency_locale.sql`,
   applied). `getCurrency`/`getLocale`/`formatCurrency`/
   `formatCurrencyWithUnit` in `lib/table-columns.ts`. Wired through the
   roadmap's literal named examples (`StatistikOverview.tsx`,
   `ApartmentFormDialog.tsx`, `RentalObjectFormDialog.tsx`) plus their host
   tables and `MissedRentTable.tsx`. **Deliberately not threaded** through
   ~6 more bare-formatter files or the 26 Swedish-locale search/sort sites
   — every nation in discussion is Swedish/SEK, so near-zero near-term
   value for real mechanical cost; documented in the roadmap for later.
7. **Batch 6 — Excel cell-parser consolidation** (Tier 3.4, scoped
   narrower than originally written). Only `cellStr` was actually
   byte-identical across all 4 importer dialogs — now in
   `lib/table-columns.ts`. `cellNum`/`cellDate`/besiktningar's
   `parseNumber`/`formatDateCell` turned out to have different signatures
   and, for besiktningar, real importer-specific logic (merged-cell
   inheritance, YYMMDD fallback) — left local rather than force a
   premature shared abstraction. Verified this distinction by reading each
   file, not by assuming from matching function names.

## Validation status

- `npx tsc --noEmit`: clean after every batch.
- `npm run lint`: unchanged baseline (7 `react-hooks/set-state-in-effect`
  errors + 1 unused-arg warning) after every batch — verified explicitly
  each time, not assumed.
- All 3 new migrations applied to the live Supabase project and confirmed
  via `supabase migration list` / a fresh `db push`.
- Dev server (already running across sessions, `/tmp/lnd-dev-server.log`)
  hot-reloaded every change; every route touched this session returns the
  expected `307` (redirect to login, unauthenticated) with no new server
  errors. One unrelated `/planritningar` 500 (`JWT expired`) appeared from
  a stale browser session's expired token — not caused by, or related to,
  any change this session; `/planritningar` was never touched.
- **Not done**: a live authenticated pass (real login, exercising the new
  admin tabs, a real Excel import to confirm the batched-write fallback
  behavior). See `docs/TODO.md`'s "Next" section — this needs the user
  present since it touches real `LND` data and can't be exercised via curl.

## Acceptance criteria

- [x] Roadmap re-audited with graphify; 2 new findings added.
- [x] Batch 1 — permission model, zero behavior change for `LND` by default.
- [x] Batch 2 — multi-nation support, zero behavior change for single-nation
      users (everyone today).
- [x] Batch 3 — feature flags, zero behavior change when unset (everything
      enabled by default).
- [x] Batch 4 — 5 more tables get admin column config; 2 of 4 form dialogs
      respect it (2 correctly deferred, documented why).
- [x] Batch 5 — currency/locale infrastructure + roadmap's named examples
      wired (rest deliberately scoped out, documented why).
- [x] Batch 6 — Excel parser consolidation (scoped to what was genuinely
      duplicated).
- [x] `npx tsc --noEmit` and `npm run lint` clean against the baseline,
      verified after every single batch, not just at the end.
- [ ] Live authenticated verification (see "Validation status" above).

## Out-of-milestone notes

- Mid-session, a chained `git stash && npm run lint && git stash pop`
  command timed out during the `lint` step, leaving the entire session's
  work (Batches 1-3 at that point) sitting in the stash instead of the
  working tree. Caught immediately, `git stash pop` run separately,
  verified restored correctly via `tsc`/lint/dev-server checks before
  continuing. Avoid chaining `git stash` with slow commands in future
  sessions — stash and pop as separate, quick operations.
- Carried over from the earlier performance-audit milestone, still
  unresolved: MongoDB Atlas database user (password printed to tool output
  during the original Mongo→Supabase migration) should be rotated/deleted
  if that hasn't happened yet; a dev server has been running in the
  background across multiple sessions now — check whether it's still
  needed.

---

# Previous milestone (same day, earlier session): Auth0/Supabase performance audit

**Complete.** Performance audit of Auth0/Supabase call patterns, requested
after the Mongo→Supabase migration to check for unnecessary calls to either
service before real traffic exists to expose them. Investigated using
`graphify` plus direct source reads; cross-referenced against the SaaS
roadmap, but every roadmap item investigated there turned out to be a
correctness/maintainability concern rather than a performance driver — this
milestone implemented four independently-found issues instead:

1. **`auth0.getSession()` deduped per request** via new `getCachedSession`
   (`lib/auth0.ts`, React `cache()`-wrapped) — cut a single page load's
   redundant session-cookie decrypts from ~7 to ~2. See
   `docs/DECISIONS.md`'s corresponding entry.
2. **Bulk-write batching** for the 2 of 5 bulk importers that actually
   needed it (`bulkUpsertApartments`, `bulkUpsertBesiktningar`) — chunked
   into batches of 50 with per-row fallback on chunk failure. The other 3
   were already correctly batched; an initial grep-based assumption that
   all 5 needed fixing was caught and corrected before any code was
   touched.
3. **`importApartmentsFromExcelAction`** no longer re-fetches the fastighet
   list once per row.
4. **Realtime-client construction overhead** — investigated, not fixed (no
   clean way to disable it in the installed `@supabase/supabase-js`
   version); documented rather than worked around.

Validation: `tsc`/lint clean, batching logic verified with an isolated
non-network throwaway script (deleted after), dev server confirmed
compiling. Live authenticated end-to-end verification was not done in that
session either — folded into this session's "Next step" above.
