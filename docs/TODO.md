# TODO

Concrete, verified work only. See `docs/HANDOFF.md` for current repository
state and the exact next step.

## Next

- **Verify the signed-in landing→dashboard round-trip.** Added 2026-08-14:
  `/` now branches on auth state (`app/page.tsx`, see `docs/DECISIONS.md`'s
  "Public landing page at `/`" entry) — signed-out renders the new
  `app/_components/landing-page.tsx`, signed-in renders the unchanged
  dashboard overview. The signed-out path and the `/sign-in` transition are
  live-verified; the actual signed-in render was not, since verification
  stopped at Google's real account-chooser screen rather than picking an
  account unattended. Low risk (the signed-in branch is unchanged code), but
  a real click-through would close the gap.
- **Reassign 3 orphaned todos once husförman signs up via Clerk.**
  Found 2026-08-14 during the Auth0→Clerk migration's data-migration check:
  `todos.tilldelad_till` has 3 rows pointing at old Auth0 IDs
  (`google-oauth2|100135078417478789388` x2, `auth0|6a70b57515160a2a0c6b36b5`
  x1) that both resolve to `husforman@lundsnation.se` (case-differing
  duplicate old Auth0 accounts for the same role) — not the current Clerk
  user. Deliberately left as-is (user's call, not a code fix): no data
  loss, just shows "no assignee" in the edit dialog until reassigned
  through the normal Todo UI once that person has a real Clerk account in
  `LND`.
- **Grant `service_role` SELECT on `gmail_tokens` and `todos`.** Found
  2026-08-14 while checking migration data with `SUPABASE_SECRET_KEY` —
  both tables reject the secret key with `permission denied`
  (`GRANT SELECT ON public.<table> TO service_role` per Postgres's own
  hint), the same "SQL-migration-created tables don't get default grants"
  gap `docs/DECISIONS.md` already documents for `authenticated`, just not
  yet fixed for `service_role` on these two tables specifically. Not
  blocking anything today (worked around via an authenticated Clerk token
  instead), but will bite the next one-off admin script that expects the
  secret key to see everything.
- **Live-verify this session's SaaS-readiness config work** (see
  `docs/HANDOFF.md`) — a real authenticated pass through the new admin
  tabs (Behörigheter, Funktioner, the 5 new Kolumner entries), the nation
  switcher (can't be exercised until a real user has an array-shaped
  nationsID claim), and a real Excel import to confirm the batched-write
  behavior in `bulkUpsertApartments`/`bulkUpsertBesiktningar` still isolates
  a single bad row correctly.
- **Visually verify the responsive UX remake.** `/statistik` at desktop
  width is now verified authenticated in a real browser (all 8 chart cards
  render, no console/hydration errors). Still outstanding: tablet (768 px)
  and phone (390 px) layouts across the rest of the app, keyboard operation,
  and loading/empty/error/success states — `resize_window` did not change
  the captured viewport in an earlier session's environment, so mobile
  couldn't be screenshotted there.
  **Acceptance criteria:** no horizontal page overflow; phone data is shown
  as cards with matching pagination; the desktop sidebar and mobile drawer
  are keyboard-operable; the 272 px/72 px sidebar toggle does not overlap or
  clip content and exposes labels through tooltips; meaningful findings from
  the web-design-guidelines audit are fixed.
- **Clean up inconsistent `RentalObject.typ` values for nation `LND`.**
  The "Bostäder per typ" statistik chart surfaced real data-quality
  issues: `"Dubblett"` and `"dubblett"` are counted as separate categories,
  and some rows have bare `"1"`/`"2"` values with no clear meaning. This is
  a source-data fix (via `/databas`), not a code fix.
- **Save and re-test the apartments Excel-import mapping for nation `LND`.**
  The last verified database state had `imports.apartments` undefined. The
  verified mapping for the `Lediga (kladd)` sheet is:
  Lägenhetsnummer=A, Storlek=B, Objekttyp=C, Antal rum=D, Ledig fr.o.m.=E,
  Årshyra=F, Hyresrabatt=blank, Hyresreduktion=G, Årshyra med red.=H,
  Månadshyra=N, Hyresgäst=I, Personnummer=J, E-post=K, Telefon=L, and
  Kontonummer=M. Do not persist personal sample rows.

## Later

- **Fix stale building-name lookup tables** in `lib/laundry-account.ts` and
  `lib/rentalobjects.ts`. Prefer the existing `fastigheter.prefixes` data
  over another hardcoded map. Also tracked as item 3.3 in
  `docs/SAAS-READINESS-ROADMAP.md` — do this regardless of SaaS plans, it's
  a live correctness bug for `LND` today. Not touched this session
  (explicitly out of scope — a correctness fix, not configuration
  infrastructure).
- **Add `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to
  `.env.local.example`.** They are read by the Gmail OAuth routes but absent
  from the example.
- **Clean up the pre-existing lint baseline:** 7
  `react-hooks/set-state-in-effect` errors, all in files unrelated to the
  Clerk migration. (The former 8th item, an unused `_idToken` warning in
  `lib/auth0.ts`, is gone — that file no longer exists as of the Auth0→Clerk
  migration, 2026-08-14.)
- **Thread `formatCurrency`/`getLocale` through the remaining ~6 files**
  with bare `currency.format(x)` calls, and the 26
  `toLocaleLowerCase("sv")`/`localeCompare(..., "sv", ...)` search/sort
  sites — deliberately deferred this session (see
  `docs/SAAS-READINESS-ROADMAP.md` Tier 6.1/6.2's "Done" notes): every
  nation currently in discussion is Swedish-language and SEK-using, so this
  has real mechanical cost for no near-term behavior difference. Revisit if
  a genuinely non-Swedish nation is onboarded.
- **Wire `TenantFormDialog.tsx`/`AndrahandsgastFormDialog.tsx` to admin
  column visibility** (Tier 4.1's remaining scope) — blocked on first making
  `app/hyresgastlista/actions.ts`'s `sanitizeInput`/
  `sanitizeAndrahandsgastInput` nation-settings-aware, since both currently
  blanket-require every field non-blank server-side. Do the server-side
  relaxation and the client-side field-hiding together, not separately —
  see the code comments in both form dialogs and
  `docs/SAAS-READINESS-ROADMAP.md`'s Tier 4.1 "Done" note for why.

## Blocked

- Rendered UX completion is blocked on an available authenticated browser
  session.

## Completed recently

- **Auth0 → Clerk migration** (2026-08-14) — full replacement of
  `@auth0/nextjs-auth0` with Clerk across identity/session, multi-tenant
  nationsID (now a Clerk org's public_metadata, read as a `nations_id`
  session claim), roles (now `user.publicMetadata.roles`, a `roles` session
  claim), admin user/role management (`lib/app-users.ts` rewritten against
  Clerk's Backend SDK), and Supabase's Third-Party Auth issuer. Every page
  now calls `auth.protect()` itself (Clerk's current resource-based
  protection model — deprecated `createRouteMatcher`-in-middleware pattern
  intentionally not used). See `docs/DECISIONS.md` for the full reasoning
  and `docs/ARCHITECTURE.md` for the current auth architecture.
- **Full SaaS-readiness configuration-infrastructure implementation**
  (2026-08-13) — see `docs/SESSION.md` for the complete breakdown: per-nation
  permission model, multi-nation operator support, feature flags, admin
  column config extended to 5 more tables + 2 form dialogs, currency/locale
  settings (scoped), Excel cell-parser consolidation (scoped). Tier 1.1,
  3.1, and 5.1 of `docs/SAAS-READINESS-ROADMAP.md` remain deliberately
  deferred pending a real second nation's onboarding conversation.
- **Auth0/Supabase performance audit and fixes** (2026-08-13, earlier
  session) — `getCachedSession()` request-level caching, batched bulk-import
  writes, apartments-importer per-row fastighet re-fetch fix.
- Application-wide responsive layout, left navigation, mobile cards, shared
  10-item pagination, responsive Excel previews, standardized MUI dialogs and
  search inputs, explicit resident/second-hand type, and expanded statistics.
- Apartments Excel import, per-nation mappings and building aliases/prefixes,
  correct Excel dates and reduction signs, and per-row skip reasons.
