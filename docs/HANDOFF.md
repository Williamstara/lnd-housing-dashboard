# Handoff

Short-lived handoff for the next coding agent. Repository state and validation
were verified immediately before writing this file.

## Current objective

None — the SaaS-readiness configuration-infrastructure implementation (all
6 batches of `docs/SAAS-READINESS-ROADMAP.md`'s "build now" scope) is
complete and statically verified. The one remaining piece is a live,
authenticated pass through the app (see "Remaining work" below), which
needs the user present since it involves real `LND` data. The next
objective otherwise is whatever the user asks for next.

## Completed this session

Full detail and reasoning: `docs/SESSION.md` (current milestone section)
and `docs/DECISIONS.md`'s 2026-08-13 entries. Summary:

1. **Batch 1**: per-nation permission model. New `nation_role_permissions`
   table (migration applied), `lib/permissions.ts`'s `requirePermission()`
   replaces ~10 duplicated `requireXRole()` guards, new admin
   "Behörigheter" tab.
2. **Batch 2**: multi-nation operator support. New `lib/active-nation.ts`
   (cookie-backed, validated against the real Auth0 claim every time), nav
   switcher (invisible until an Auth0 Action change makes nationsID an
   array — external to this repo, not done). Every page/action/API route
   swept onto it.
3. **Batch 3**: feature flags (`enabled_features` column, migration
   applied). Gates Gmail nav entries, laundry buttons, key-handover
   toggles. New admin "Funktioner" tab.
4. **Batch 4**: admin column config extended to 5 more tables + 2 of 4 form
   dialogs. **`TenantFormDialog`/`AndrahandsgastFormDialog` intentionally
   NOT wired** — see "Important gotchas" below, this is the single most
   important thing not to accidentally "fix" without reading the reasoning
   first.
5. **Batch 5**: currency/locale settings (`currency`/`locale` columns,
   migration applied) — wired through the roadmap's named examples only,
   not exhaustively. See `docs/TODO.md`'s "Later" section for the
   deliberately-deferred remainder.
6. **Batch 6**: Excel cell-parser consolidation — only `cellStr` (the one
   genuinely duplicated helper), not `cellNum`/`cellDate` (those turned out
   to differ per file on closer reading).

## Validation status

- `npx tsc --noEmit` — clean.
- `npm run lint` — unchanged baseline (7 `react-hooks/set-state-in-effect`
  errors + 1 unused-arg warning), verified after every batch individually.
- 3 new Supabase migrations applied to the live project and confirmed via
  `supabase migration list`:
  `20260813140000_nation_role_permissions.sql`,
  `20260813150000_nation_features.sql`,
  `20260813160000_nation_currency_locale.sql`.
- Dev server hot-reloaded every change; every touched route returns the
  expected `307` with no new server errors (one pre-existing, unrelated
  `/planritningar` 500 from a stale browser JWT — not caused by this
  session, that route was never touched).
- **Not done**: live authenticated verification. See "Remaining work" (1).

## Important gotchas for the next agent

1. **Do not wire `TenantFormDialog.tsx`/`AndrahandsgastFormDialog.tsx` to
   admin column visibility without also fixing
   `app/hyresgastlista/actions.ts`'s `sanitizeInput`/
   `sanitizeAndrahandsgastInput` first.** Both blanket-require every field
   non-blank server-side (`Object.values(trimmed).some((value) => value === "")`).
   `ApartmentFormDialog`/`RentalObjectFormDialog` didn't have this problem
   (their server-side checks only hard-require a few specific fields), which
   is why only those two got wired this session. Doing the client half
   alone here would make every save with a hidden field silently fail.
2. **`bulkUpsertTenants`, `bulkUpsertAndrahandsgaster`, `bulkUpsertRentalObjects`
   are already correctly batched** (one composite-key `.upsert()` call) —
   from the earlier performance-audit session. Don't "fix" them again.
3. **Locale/currency formatting is deliberately incomplete** — see
   `docs/TODO.md`'s "Later" section for the exact list of what's still
   hardcoded to `"sv-SE"`/`"kr"` and why that was a conscious call, not an
   oversight.
4. **Avoid chaining `git stash` with slow commands** (e.g.
   `git stash && npm run lint && git stash pop` in one Bash call) — this
   happened mid-session, the `lint` step ran long, the tool call timed out,
   and `git stash pop` never ran, leaving the whole session's work sitting
   in the stash. Caught and recovered, but do stash/pop as separate calls
   going forward.

## Current Git and working-tree state

Nothing from this session (or the two prior sessions — the migration and
the performance audit) has been committed. Run `git status` for the exact
list. New untracked files from this session: `lib/active-nation.ts`,
`lib/permissions.ts`, `app/actions.ts`, and the 3 new migration files under
`supabase/migrations/`. Modified files span most of `lib/*.ts`, most of
`app/*/page.tsx` and `app/*/actions.ts`, most of `app/api/**/route.ts`,
`components/AdminPage.tsx`, `components/NavBar.tsx`,
`components/ApartmentsTable.tsx`, `components/RentalObjectsTable.tsx`,
`components/TenantsTable.tsx`, `components/AndrahandsgasterTable.tsx`,
`components/ArchiveTable.tsx`, `components/UppsagningTable.tsx`,
`components/TodoList.tsx`, `components/StatistikOverview.tsx`,
`components/MissedRentTable.tsx`, `components/ApartmentFormDialog.tsx`,
`components/RentalObjectFormDialog.tsx`, all 4 Excel-import dialogs, and
the shared docs.

## Remaining work

1. **Live authenticated verification** — do this with the user present.
   Concretely: exercise the new admin tabs (Behörigheter, Funktioner, the 5
   new Kolumner entries) against real `LND` data; run a real Excel import
   through `/lediga-lagenheter` and/or `/besiktningar` including a
   deliberately-bad row to confirm the (earlier session's) batched-write
   fallback still isolates it correctly; the nation switcher can't be
   exercised without an Auth0 Action change (external to this repo) first.
2. Re-run `/graphify --update` so the graph reflects this session's new
   files/functions.
3. Everything in `docs/TODO.md` remains outstanding — see that file for
   the full "Next"/"Later" breakdown, including the two items this session
   specifically deferred (Tenant/Andrahandsgast form field-hiding, the
   remaining currency/locale sites).
4. MongoDB Atlas user rotation/deletion (carried over from the original
   migration session) — check whether this has happened yet.
5. Commit the working tree — only when the user explicitly asks. Given the
   scale (3 sessions' worth of uncommitted work: the migration, the
   performance audit, and this SaaS-readiness implementation), confirm with
   the user how they want this split into commits before running `git add`/
   `git commit`.

## Blockers

None — the one open item (live verification) is a deliberate "needs the
user present" pause, not a blocker.

## Timestamp

2026-08-13 (local, per this session's clock)

## Current agent

Claude Code
