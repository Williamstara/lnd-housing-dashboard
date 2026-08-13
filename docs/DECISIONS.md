# Decisions

Durable, non-obvious decisions that a future agent might otherwise
accidentally reverse. Only decisions verified from this repository's actual
code/history or from direct work done in an agent session are recorded here
— no invented historical rationale. See `AGENTS.md` for how this file is
maintained.

---

## MongoDB-to-Supabase migration is complete

- **Date**: 2026-08-13
- **Status**: accepted
- **Context**: The app ran on MongoDB with app-layer-only tenant isolation
  (see the entries below for the specific blockers hit along the way). The
  full migration — schema, RLS, data migration, and converting every
  `lib/*.ts` file — is described across this file's other 2026-08-13
  entries and `docs/SESSION.md`.
- **Decision**: `mongodb` and the unused `@supabase/ssr` dependency were
  removed from `package.json`; `lib/mongodb.ts` was deleted;
  `MONGODB_URI`/`MONGODB_DB` were removed from `.env.local`. `AGENTS.md` and
  `docs/ARCHITECTURE.md` were rewritten to describe the Postgres/Supabase
  architecture as current, not MongoDB.
- **Reason**: Nothing in the app reads from MongoDB after every `lib/*.ts`
  file was converted (verified: `grep` for `mongodb`/`MONGODB` imports
  across `lib/`, `app/`, `components/` returns nothing but `lib/mongodb.ts`
  itself, which was then deleted) — keeping the dependency and unused env
  vars around serves no purpose once every read path is gone.
- **Consequences**: There is no MongoDB fallback anymore. If a bug surfaces
  that seems related to data that "should still be in Mongo," it isn't —
  the one-time migration script (deleted after use, per
  `scripts/backfill-nations-id.mjs`'s established precedent) already moved
  everything real that existed at migration time. `scripts/backfill-nations-id.mjs`
  and `scripts/fix-data-quality.mjs` still exist as historical, never-rerun
  artifacts of the pre-Supabase era and still `import` from `mongodb` —
  they will fail if actually executed now that the package is gone, which
  is fine (they're not meant to be re-run) but worth knowing if someone
  stumbles on them.
- **Files**: `package.json`, `lib/mongodb.ts` (deleted), `.env.local`,
  `AGENTS.md`, `docs/ARCHITECTURE.md`.

---

## `missed-rent.ts` surfaced a real cross-database ID mismatch during the phased conversion — expected, not a bug

- **Date**: 2026-08-13
- **Status**: accepted (informational — a gotcha for any future phased
  migration in this repo, not an ongoing issue)
- **Context**: Converting `lib/*.ts` files one at a time (rather than all at
  once) means, for the files converted first, some *other* file they
  cross-reference is still reading from MongoDB. Concretely: after
  converting `lib/apartments.ts` to Postgres (new UUID primary keys) but
  before converting `lib/missed-rent.ts`, `/lediga-lagenheter` crashed with
  `invalid input syntax for type uuid: "6a6b74d57dc21aaf00bb0007"` — a
  Mongo ObjectId string, still being read from the not-yet-converted
  `missed-rent` collection's `apartmentId` field, was passed into the
  now-Postgres `getApartmentsByIds`, which expects real UUIDs.
- **Decision**: No code fix was needed beyond continuing the planned
  conversion order — `rentalobjects.ts` then `missed-rent.ts` were
  converted next specifically because `missed-rent.ts` cross-references
  both, exactly as the original migration plan's phase ordering called for.
  Once `missed-rent.ts` itself moved to Postgres (reading `apartment_id`/
  `rental_object_id` as real UUIDs, populated correctly by the earlier data
  migration script's in-memory ID-mapping), the error was gone.
- **Reason**: This is the expected shape of a collection-by-collection
  migration, not a design flaw — any two `lib/*.ts` files with a
  cross-reference must be converted in the same "generation" (or the
  referencing one must go last) or a transient type mismatch like this
  will surface. Recorded here so a future agent doing a similar phased
  conversion (of anything, not just this stack) recognizes this failure
  mode immediately instead of suspecting a data-migration bug.
- **Consequences**: None ongoing — purely a mid-migration transient state.
  Worth remembering if `docs/TODO.md`-style future multi-file conversions
  come up again in this repo.
- **Files**: `lib/missed-rent.ts`, `lib/apartments.ts`, `lib/rentalobjects.ts`.

---

## Supabase third-party auth requires a plain `role: "authenticated"` claim on the Auth0 ID token — separate from the app's own roles claim

- **Date**: 2026-08-13
- **Status**: accepted
- **Context**: While building the Postgres/RLS proof of concept
  (`lib/supabase-server.ts`, Phase 2 of the Mongo→Supabase migration —
  see `docs/SESSION.md`), a real, valid, correctly-issued Auth0 ID token
  (matching issuer, RS256, containing the app's own namespaced
  `https://lnd-housing-dashboard/nationsID`/`.../roles` claims) was
  forwarded to Supabase via Third-Party Auth, yet every request was
  silently executed as the Postgres `anon` role instead of `authenticated`
  — confirmed by comparing a request with the real token against a request
  with no `Authorization` header at all: byte-identical responses. No
  error was raised; RLS/grants just quietly denied everything, which is
  easy to misdiagnose as a grants or RLS policy bug (both were in fact
  fine — see the entry below). Root cause (confirmed via Supabase's own
  support AI, then verified by fix): PostgREST/Supabase's Third-Party Auth
  determines which Postgres role to execute a request as by reading a
  **plain, non-namespaced `role` claim** directly on the token. Auth0 does
  not set this by default, and it is unrelated to this app's own
  `ROLES_CLAIM` (`ekonomi`/`husvd`/`husforman`/`vaktmastare`/`admin`) —
  same English word, two unrelated systems (Postgres execution role vs.
  this app's authorization roles).
- **Decision**: The Auth0 Post-Login Action that already sets the app's
  two namespaced claims (see `lib/nations.ts`/`lib/roles.ts` code comments
  for its expected shape) must also call
  `api.idToken.setCustomClaim('role', 'authenticated')`. This lives only
  in the Auth0 dashboard (not version-controlled in this repo, per
  `docs/ARCHITECTURE.md`'s existing note on the Action). Documented
  directly in `lib/supabase-server.ts` since nothing in this repo would
  otherwise reveal the dependency.
- **Reason**: No alternative exists that keeps Auth0 as the identity
  provider — this claim is specifically how Supabase's Third-Party Auth
  integration maps an external, Supabase-unaware JWT issuer onto its own
  role-based Data API execution model.
- **Consequences**: A logged-in user's *existing* session/token predates
  this claim and will keep silently hitting `anon` until they log out and
  back in (a fresh Auth0 login is required to mint a token with the new
  claim — this is not something a page refresh or token silent-refresh
  fixes). If the Auth0 Action is ever edited by hand again, this line must
  be preserved. If Supabase's third-party auth stops giving `anon`-like
  silent denials for no visible reason, this claim is the first thing to
  check.
- **Files**: `lib/supabase-server.ts` (comment only — the Action itself is
  external to this repo).

---

## New Postgres tables need explicit `GRANT`s to `authenticated`, separate from RLS policies

- **Date**: 2026-08-13
- **Status**: accepted
- **Context**: Tables created via a plain SQL migration (`supabase db
  push`, not the Supabase dashboard's Table Editor) do **not** automatically
  receive the base table privileges (`SELECT`/`INSERT`/`UPDATE`/`DELETE`)
  that Supabase's dashboard-created tables get by default — only
  `REFERENCES`/`TRIGGER`/`TRUNCATE` are granted automatically. RLS policies
  only restrict *which rows* an already-permitted operation can see/touch;
  without the base `GRANT`, Postgres blocks the operation before RLS is
  even consulted, raising `42501 permission denied for table X` — easy to
  misread as an RLS policy bug when the policies are in fact correct (this
  exact error, plus the `role: authenticated` issue above, compounded and
  had to be debugged separately during the same session).
- **Decision**: `supabase/migrations/20260813001732_grants.sql` explicitly
  grants `SELECT, INSERT, UPDATE, DELETE` on every table in `public` to
  `authenticated`, plus `ALTER DEFAULT PRIVILEGES` so future `create table`
  migrations don't need to repeat it. `anon` gets nothing — this app has no
  anonymous access anywhere (every route requires an Auth0 session,
  enforced in `proxy.ts`).
- **Reason**: Matches this app's existing model where any authenticated
  user can attempt any operation and role-specific restrictions are
  enforced in `app/*/actions.ts`, with RLS enforcing tenant isolation
  underneath — the base grant just has to exist for RLS to have anything
  to filter.
- **Consequences**: Any future table added outside a migration that
  includes this default-privileges setup (e.g. created directly via the
  SQL editor in a way that bypasses migration history) may need the same
  explicit grant repeated.
- **Files**: `supabase/migrations/20260813001732_grants.sql`.

---

## `@supabase/ssr`'s `createServerClient` is incompatible with third-party `accessToken` mode — use plain `@supabase/supabase-js` `createClient` instead

- **Date**: 2026-08-13
- **Status**: accepted
- **Context**: `@supabase/ssr`'s `createServerClient` (v0.12.4) always
  calls `client.auth.onAuthStateChange(...)` internally, to sync a
  Supabase-native session to cookies on token refresh. When the client is
  configured with the `accessToken` option (third-party auth mode, used
  here to forward the Auth0 ID token), `@supabase/supabase-js` turns
  `client.auth` into a Proxy that throws on any property access — by
  design, since third-party auth means Supabase's own native auth flow
  should never be touched. `createServerClient`'s own internal
  `onAuthStateChange` call therefore throws immediately at client
  construction: `"Supabase Client is configured with the accessToken
  option, accessing supabase.auth.onAuthStateChange is not possible"`.
- **Decision**: `lib/supabase-server.ts` uses the plain `createClient` from
  `@supabase/supabase-js` directly, not `createServerClient` from
  `@supabase/ssr`.
- **Reason**: `@supabase/ssr`'s entire value-add is the cookie-sync
  machinery for a Supabase-native session — irrelevant here, since Auth0
  owns the only session that exists in this app. There is nothing
  `@supabase/ssr` provides that this server-only, per-request client needs.
- **Consequences**: `@supabase/ssr` is an installed dependency
  (`package.json`) that is not actually used anywhere in this codebase —
  worth removing if no future need for a Supabase-native/cookie-based flow
  emerges (e.g. this app never gained a reason to run Supabase Auth
  natively alongside Auth0).
- **Files**: `lib/supabase-server.ts`.

---

## The besiktningar "Status" bar became a shared `SegmentedBar` component; Missade hyresintäkter gained a "Per ansvarig" breakdown using it

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: The user asked for "a chart like the one in besiktningar
  with the status but for the ansvarig of the missad hyra instead" inside
  `/statistik`'s "Missade hyresintäkter" card. The besiktningar status bar
  (segmented/stacked progress bar + legend) had been built inline in
  `BesiktningarTable.tsx`; reusing the same visual for a second, unrelated
  dataset was the second real consumer of that exact ~25-line JSX block.
  First pass grouped by ansvarig and counted **cases** (mirroring
  besiktningar's status bar, which counts besiktningar); user immediately
  corrected: "i want it to display the actual number (the estimated miss
  for that ansvarig, not the fkn amounts of misses)" — i.e. the summed
  **kr amount** attributed to each ansvarig, not a case count.
- **Decision**: Extracted `components/charts/SegmentedBar.tsx` (`segments:
  {label, value, color}[]`, matching the existing `BarChart`/`DonutChart`
  prop shape, plus an optional `valueFormatter` for the legend/tooltip
  text — needed once this became a currency chart) and pointed
  `BesiktningarTable.tsx`'s Status card at it instead of its inline JSX
  (that usage stays a plain count, no formatter). Added
  `getMissedRentByAnsvarig` to `lib/statistik.ts` — sums each row's
  `totalMissat` per `ansvarig` (free text; blank values bucket into "Ingen
  ansvarig" rather than being dropped), returning `{label, total}[]`, not
  a count. Computed server-side in `app/statistik/page.tsx`, passed as
  `missedRentByAnsvarig`, and rendered in `StatistikOverview.tsx` via
  `SegmentedBar` with `CATEGORICAL`-cycled colors (not `STATUS` — ansvarig
  names aren't a severity state) and `valueFormatter={kr}`, inside the
  existing "Missade hyresintäkter" card below the year bar chart, hidden
  entirely if there are no missed-rent rows.
- **Reason**: The moment a second real consumer of an identical UI block
  appeared, extracting it matched the codebase's own "reuse before
  creating" convention better than copy-pasting the same JSX again. Money,
  not case count, is what "Missade hyresintäkter" (missed *income*) is
  actually about — matching the card's own subject rather than the
  besiktningar analogy literally.
- **Consequences**: Any future "N categories as a proportional bar + legend"
  need in this codebase should reuse `SegmentedBar`, not reinvent the
  flexGrow-segment pattern a third time — remembering it can represent
  either a count (no formatter) or a summed quantity (pass
  `valueFormatter`), so check which one a new use case actually needs
  rather than assuming it's always a count.
- **Files**: `components/charts/SegmentedBar.tsx` (new),
  `components/BesiktningarTable.tsx`, `lib/statistik.ts`,
  `app/statistik/page.tsx`, `components/StatistikOverview.tsx`.

---

## Besiktningar gained a shared "Övriga anteckningar" field, not role-gated

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: Besiktningar already had two note fields tied to a specific
  role's workflow: `vaktmastareAnteckning` and `husformanAnteckning`. The
  user asked for a third, shared free-text field ("Övriga anteckningar")
  that husförman, husvd, *and* ekonomi can all fill in.
- **Decision**: Added `ovrigaAnteckningar: string` to `Besiktning` and
  `BesiktningEditInput` (`lib/besiktningar.ts`), defaulted to `""` for
  existing besiktningar via `doc.ovrigaAnteckningar ?? ""` in `mapDoc` (they
  predate the field and have no value stored at all — exactly the user's
  "blank for now" expectation). Wired through the Add/Edit dialogs,
  desktop/mobile table+card views, search, and the Excel importer (which
  has no column mapping for it, so imported rows always get `""`) in
  `BesiktningarTable.tsx`, plus a read-only column in
  `ArkivBesiktningarTable.tsx` for consistency.
- **Reason**: No new permission gate was added because none of the existing
  note fields are role-restricted either — `updateBesiktningAction`/
  `createBesiktningAction` only require `requireUser()` (any authenticated
  nation member), and `/besiktningar` has no page-level role gate. Husvd and
  ekonomi already had unrestricted edit access before this change; admin is
  superuser everywhere. The only role-restricted besiktningar actions are
  payment-marking (husvd/ekonomi) and archive/delete (husvd/admin resp.
  ekonomi/husvd/admin — see the earlier archive-role decision above) —
  editing note fields was never one of them, so "which roles can fill it
  in" was already satisfied by the existing access model without new code.
- **Consequences**: A future role-scoped restriction on this field (e.g. if
  vaktmästare-only accounts somehow gained besiktningar access) would need
  an explicit new guard — none exists today because none was needed.
- **Files**: `lib/besiktningar.ts`, `components/BesiktningarTable.tsx`,
  `components/ArkivBesiktningarTable.tsx`,
  `components/BesiktningarExcelImportDialog.tsx`.

---

## Besiktningar archiving is husvd/admin only; ekonomi keeps ARCHIVE_ROLES everywhere else

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: User: "Remove ekonomi from archiving from besiktningar."
  Archiving besiktningar previously used the shared `ARCHIVE_ROLES`
  (ekonomi/husvd/admin, `lib/roles.ts`) — the same constant `redo-för-
  kontrakt` and `lediga-lägenheter`'s bulk-archive-by-date feature use. The
  request was scoped to besiktningar only.
- **Decision**: Added a besiktningar-only `requireHusvdRole()` guard
  (`app/besiktningar/actions.ts`) — `hasRole(user, ROLES.HUSVD)`, which
  still passes for `admin` (superuser bypass) but not `ekonomi` — and
  pointed `archiveBesiktningAction`/`archiveBesiktningarBulkAction` at it.
  `deleteBesiktningAction` still uses the original `requireArchiveRole()`
  (unchanged, ekonomi/husvd/admin) since only archiving was in scope.
  Client-side, `BesiktningarTable.tsx`'s single `canArchive` flag (which had
  been gating *both* the archive icon/button and the delete icon) was split
  into `canArchive` (husvd/admin, now used only for archive controls) and
  `canDelete` (unchanged ARCHIVE_ROLES, used only for delete controls) —
  without this split an ekonomi user would still see an archive button that
  fails on click.
- **Reason**: `ARCHIVE_ROLES` is shared app-wide; narrowing it directly
  would have also stripped ekonomi's archive rights from redo-för-kontrakt
  and lediga-lägenheter, which was never asked for. A besiktningar-specific
  guard keeps the change scoped exactly to what was requested.
- **Consequences**: Any future besiktningar archive-adjacent action should
  use `requireHusvdRole()`, not `requireArchiveRole()`/`ARCHIVE_ROLES`,
  unless deliberately extending access back to ekonomi.
- **Files**: `app/besiktningar/actions.ts`, `components/BesiktningarTable.tsx`.

---

## Missade hyror can be anchored to a Databas rental object, not just an Apartment

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: `MissedRentDoc`/`MissedRentRow` were hard-keyed to
  `apartmentId` (a `lib/apartments.ts` record) — rent can only be "missed"
  for something currently in the lediga lägenheter pipeline. The user
  pointed out rent can be missed for reasons other than "not rented out"
  (e.g. an occupied unit whose tenant didn't pay), and those units often
  have **no** `Apartment` record at all — only a `RentalObject` (Databas)
  row, since Databas is the canonical all-units table independent of
  current occupancy.
- **Decision**: `MissedRentDoc`/`MissedRentRow` now carry both
  `apartmentId: string | null` and `rentalObjectId: string | null` (exactly
  one is set per row) plus `manualLedigFrom: string | null` (only used with
  `rentalObjectId`, since `RentalObject` has no `ledigFrom` of its own to
  derive a "missed since" date from — whoever adds the row supplies it).
  `getMissedRentRows` joins against whichever collection the doc points at
  (added `getRentalObjectsByIds` to `lib/rentalobjects.ts`, mirroring the
  existing `getApartmentsByIds`). The "Lägg till" dialog in
  `MissedRentTable.tsx` gained a "Källa" select (Lediga lägenheter /
  Databas); the Databas path shows a `RentalObject` picker (excluding ones
  already tracked, computed client-side from already-fetched `rows` +
  `rentalObjects` props — no new query) plus a "Missad hyra sedan" date
  field.
- **Reason**: Matches the actual business reality (rent can be missed for
  reasons unrelated to vacancy) without inventing a parallel tracking
  collection — one `missed-rent` collection, one row shape, two possible
  anchors. Deriving "available rental objects" from already-fetched props
  avoided adding a new server round trip.
- **Consequences**: Existing `missed-rent` documents have no
  `rentalObjectId`/`manualLedigFrom` fields at all (not even `null`) — every
  read site defaults them via truthy checks (`doc.apartmentId ? ... : doc.
  rentalObjectId ? ... : skip`), so old apartment-anchored rows are
  unaffected. Any code that assumed `MissedRentRow.apartmentId` is always a
  non-null `string` needed updating — found and fixed two: `app/lediga-
  lagenheter/page.tsx`'s `missedRentApartmentIds` (now filters out
  databas-anchored rows, which have nothing to highlight in that table
  anyway) and `lib/statistik.ts`'s `getUthyrningsgrad` (added an explicit
  null check before the `Set.has()` call). Also fixed
  `scripts/check-statistik.mjs`, found broken by an *earlier* change this
  session (the "Bostäder per typ" chart) — its synthetic `RentalObject`
  fixtures had no `typ` field, so `npm run check:statistik` was silently
  broken before this session's work even started being validated against
  it; added `typ` to the fixtures and a `bostaderPerTyp` assertion.
- **Files**: `lib/missed-rent.ts`, `lib/rentalobjects.ts`,
  `app/statistik/actions.ts`, `app/statistik/page.tsx`,
  `components/MissedRentTable.tsx`, `app/lediga-lagenheter/page.tsx`,
  `lib/statistik.ts`, `scripts/check-statistik.mjs`.

---

## Besiktningar's "Status" card is a plain segmented bar + legend, not a chart component

- **Date**: 2026-08-04
- **Status**: accepted (final of three attempts the same session — the
  first two are recorded here only so a future agent doesn't re-try them)
- **Context**: The user asked for a "counter/chart" on `/besiktningar`
  showing how many besiktningar are Obehandlade (untouched), Klara för
  betalning, and Betalda.
  1. First pass reused the existing `DonutChart` (`components/charts/
     DonutChart.tsx`) with those three segments.
  2. User asked for "a line chart like the statistik page... just have one
     line with all the different statuses". No line-chart component existed
     in `components/charts/` and no charting library is installed
     (`package.json` has no recharts/d3/visx/etc.), so a new hand-rolled SVG
     `components/charts/LineChart.tsx` was added, drawing one polyline
     through the three points.
  3. User: **"That's not what i ment... i want it like a status bar."** The
     line chart was rejected outright — a status bar means a single
     horizontal bar divided into colored segments proportional to each
     count (a segmented/stacked progress bar), not a point-and-line plot.
     `LineChart.tsx` was deleted (unused anywhere else, so no dead code
     risk in keeping it).
- **Decision**: Implemented the segmented bar directly in
  `BesiktningarTable.tsx` with plain MUI `Box`/`Stack` — no new chart
  component. A flex `Box` with one child `Box` per non-zero status
  (`flexGrow: value`, `bgcolor: status color`) naturally divides the bar
  proportionally with no manual percentage math, plus a `role="img"` +
  `aria-label` summary on the container and a native `title` per segment.
  A legend row below shows every status (including zero-count ones) as a
  colored dot + label + count. `statusSegments`/`statusCounts` (the same
  memo from the two earlier attempts) feed both.
- **Reason**: This is genuinely just a styled `<div>` with flex children —
  reaching for an SVG chart component (as attempts 1 and 2 both did) was
  over-engineering a proportional bar that flexbox already solves in a few
  lines, and matches AGENTS.md's "prefer semantic MUI components... don't
  rebuild a design system" guidance better than a bespoke chart would.
- **Consequences**: `components/charts/LineChart.tsx` was added and then
  removed within the same session — if a genuine multi-point trend/line
  need comes up later, it will need to be rebuilt from scratch (or a
  charting dependency reconsidered at that point), since the ladder for
  *this* request (a proportional bar) never actually needed a chart
  component. `STATUS.serious`/`warning`/`good` is still the intended color
  mapping for obehandlade/klara-för-betalning/betalda respectively.
- **Files**: `components/BesiktningarTable.tsx`;
  `components/charts/LineChart.tsx` was added then deleted.

---

## Besiktningar bulk-mark/archive gained a "select by date" shortcut, not new bulk actions

- **Date**: 2026-08-04
- **Status**: accepted (revised twice the same day from direct user feedback
  — see the two rounds below; this entry describes the final behavior)
- **Context**: The user asked for a button to bulk-mark besiktningar as
  "klara för betalning" and "utbetalda", pickable by besiktningsdatum, plus
  the same for archiving. Investigation found the entire bulk backend
  already existed and was already wired into the UI: `lib/besiktningar.ts`
  (`markKlarForBetalningBulk`, `markBetalningGjordBulk`,
  `archiveBesiktningarBulk`), the matching Server Actions in
  `app/besiktningar/actions.ts`, and a full row-checkbox + "X valda" bulk
  action bar (with "Klar för betalning"/"Betalning gjord"/"Arkivera"
  buttons) already in `components/BesiktningarTable.tsx`, for both the
  desktop table and the mobile card view. The only real gap: selecting a
  whole day's rows meant manually ticking each checkbox (or "select all on
  this page", which only covers the current page slice) — there was no way
  to select "everything dated X" directly.
- **Decision (round 1)**: Added a `bulkDate` date field + a separate
  "Markera N st för datumet" button that *added* matching rows to the
  existing selection on click.
- **Decision (round 2, user feedback: "hold the markering until the date is
  changed so I don't have to click again")**: Removed the button. The date
  field's `onChange` (`handleBulkDateChange`) now *replaces* `selectedIds`
  with exactly the rows matching the new date directly — no click needed —
  and that selection holds through manual per-row adjustments until the
  date field changes again or "Avmarkera alla" is pressed.
- **Decision (round 3, user feedback: "the bulk marking doesn't work like it
  should... this is so I can perform multiple actions for one date when
  bulk working")**: `bulkMarkKlarForBetalning`, `bulkMarkBetalningGjord`,
  and `bulkArchive` each called `clearSelection()` after their Server Action
  resolved, silently wiping the date-driven selection after the *first*
  action — defeating the entire point of holding it. Removed all three
  `clearSelection()` calls; the selection now only changes via the date
  field or "Avmarkera alla", exactly as stated in round 2's own comment,
  which round 3 had accidentally broken.
- **Reason**: The bulk mark/archive UI and backend were already correct and
  tested-by-existing-use; inventing a parallel "bulk by date" action path
  would have duplicated `markKlarForBetalningBulk`/`markBetalningGjordBulk`/
  `archiveBesiktningarBulk` for no reason. The end goal (stated explicitly by
  the user) is to run several bulk actions in sequence against one date's
  selection — e.g. klar-för-betalning, then betalning gjord, then arkivera —
  without re-picking the date between each step.
- **Consequences**: Any future change to these three bulk handlers must not
  reintroduce a `clearSelection()`/`setSelectedIds(new Set())` call on
  success — that reproduces exactly the round-3 bug. Verified live in a real
  authenticated browser against real `LND` data across both rounds 2 and 3;
  the actual mark/archive buttons were **not** clicked during verification,
  since that would mutate real inspection records — the underlying actions
  were already in the codebase before this session and were not modified.
- **Files**: `components/BesiktningarTable.tsx`.

---

## Fastighet name resolution goes through an admin-configurable alias table, not a hardcoded map

- **Date**: 2026-08-03
- **Status**: accepted
- **Context**: `ExcelImportDialog.tsx`, `AndrahandsgastExcelImportDialog.tsx`,
  and `RentalObjectExcelImport.tsx` each had a hardcoded
  `FASTIGHET_MAP: Record<string, string>` translating raw spreadsheet
  fastighet text (e.g. `"arkivet"`) into an old long-form canonical name
  (e.g. `"Arkivet (223 59, Lund)"`). The `fastigheter` collection actually
  stores short names (`"Arkivet"`, `"Sankt Thomas 35"`, etc.). The mismatch
  meant the hardcoded map actively translated valid input into a name that
  could never match, silently dropping 100% of rows on tenant Excel
  imports.
- **Decision**: Removed the per-file hardcoded maps. Added
  `FastighetAlias` (`{ alias, fastighet }`) as a per-nation setting on
  `NationSettings.fastighetAliases`, with `DEFAULT_FASTIGHET_ALIASES` as the
  seed (today's known aliases, corrected to the real short names) and
  `resolveFastighetName(raw, fastigheter, aliases)` /
  `applyFastighetAlias(raw, aliases)` as the shared, case-insensitive
  resolution logic (`lib/table-columns.ts`). Admin-editable at
  Admin → Import-mappningar (`components/AdminPage.tsx`'s
  `FastighetAliasEditor`).
- **Reason**: The previous hardcoded map was nation-specific (`LND`'s
  buildings) baked into general-purpose importer components, and was
  already stale/wrong for the one nation actually using it. Making it a
  per-nation, admin-editable setting fixes the immediate bug and removes
  the class of bug for any future nation whose sheet uses abbreviations.
- **Consequences**: `lib/laundry-account.ts` and `lib/rentalobjects.ts`
  still contain their own, separate hardcoded long-form fastighet-name
  lookup tables (`FASTIGHET_BUILDING`, `FASTIGHET_LAUNDRY_BUILDING`,
  `FASTIGHET_PREFIXES`) — **deliberately not touched** in this pass (see
  the "Deferred: stale fastighet naming" decision below).
- **Files**: `lib/table-columns.ts`, `lib/nation-settings.ts`,
  `app/admin/actions.ts`, `components/AdminPage.tsx`,
  `components/ExcelImportDialog.tsx`,
  `components/AndrahandsgastExcelImportDialog.tsx`,
  `components/RentalObjectExcelImport.tsx`.

---

## Deferred: stale fastighet naming in laundry-account.ts and rentalobjects.ts

- **Date**: 2026-08-03
- **Status**: accepted (as a deliberate scope boundary, not a fix)
- **Context**: While diagnosing the fastighet-alias bug above,
  `lib/laundry-account.ts` (`FASTIGHET_BUILDING`,
  `FASTIGHET_LAUNDRY_BUILDING`) and `lib/rentalobjects.ts`
  (`FASTIGHET_PREFIXES`) were found to use the same obsolete long-form
  fastighet names as dictionary **keys**, which will not match today's
  short names stored in `fastigheter`.
- **Decision**: The user explicitly scoped the fix to "the import" only;
  these two files were left untouched.
- **Reason**: Explicit user instruction to limit scope for that session.
  Not a technical judgment that these are fine as-is.
- **Consequences**: `createLaundryAccount` (`lib/laundry-account.ts`) will
  throw `"Okänd fastighet"` for any tenant whose `fastighet` is
  `"Sankt Thomas 35"`, `"Sankt Thomas 39"`, or `"Sankt Thomas 39 B"` (the
  `"Arkivet"` case happens to survive via a `.includes("Arkivet")`
  fallback). `findRentalObjectForApartment`'s prefix-based fallback lookup
  in `lib/rentalobjects.ts` silently returns no match instead of throwing
  (lower severity, degrades to "no fallback" rather than an error). See
  `docs/TODO.md` for the concrete follow-up.
- **Files**: `lib/laundry-account.ts`, `lib/rentalobjects.ts`.

---

## Apartments' fastighet is derived from lägenhetsnummer prefix, not read from a spreadsheet column

- **Date**: 2026-08-03
- **Status**: accepted
- **Context**: A new "Importera från Excel" feature was added for Lediga
  lägenheter (apartments had none before). The user's real sheet does not
  reliably have a usable Fastighet column, but every lägenhetsnummer in
  practice starts with a building-specific prefix (e.g. `B`/`C`/`D` for
  Arkivet, `NH` for Sankt Thomas 39).
- **Decision**: Added `prefixes: string[]` to the `Fastighet` record itself
  (`lib/fastigheter.ts`), editable per-building on the existing
  `/fastigheter` admin page (`components/FastigheterTable.tsx`). The
  apartments importer resolves fastighet via
  `resolveFastighetFromPrefix(lagenhetsnummer, fastigheter)` (longest
  matching prefix wins, case-insensitive) instead of reading a mapped
  column. `DEFAULT_APARTMENT_IMPORT` (`lib/table-columns.ts`) has no
  `fastighet` field at all.
- **Reason**: Matches the data that's actually reliable in the source
  sheet, and reuses the existing `/fastigheter` admin surface rather than
  inventing a second place to configure per-building data.
- **Consequences**: A fastighet with no prefixes configured will never
  successfully import any of its apartments (every row silently skipped as
  "no fastighet match") — this is expected behavior, not a bug, but it's a
  sharp edge for a newly-created fastighet. If the apartments importer is
  ever pointed at a nation/sheet where a real Fastighet column *is*
  reliable, this prefix-based approach may need to become optional rather
  than the only path.
- **Files**: `lib/fastigheter.ts`, `app/fastigheter/actions.ts`,
  `components/FastigheterTable.tsx`, `lib/table-columns.ts`,
  `components/ApartmentExcelImport.tsx`.

---

## Excel date cells must be read with local `Date` getters, not UTC getters

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: SheetJS (`xlsx`, `cellDates: true`) reconstructs an Excel
  date-serial cell as a JS `Date` anchored at **local** timezone midnight
  for that calendar day, not UTC midnight. `BesiktningarExcelImportDialog.tsx`
  (pre-existing) and the new `ApartmentExcelImport.tsx` were both reading
  it back with `getUTCFullYear()`/`getUTCMonth()`/`getUTCDate()`, which
  silently shifts the date back one day in any timezone ahead of UTC.
  Verified directly against a real cell in a user-supplied file
  (`w: "2026-07-01"` in the raw cell vs. `"2026-06-30"` produced by the old
  code, on a machine in `Europe/Berlin`).
- **Decision**: Added `excelDateCellToISO(value: Date): string` to
  `lib/table-columns.ts` (uses local getters) and pointed both dialogs at
  it, deleting each file's own UTC-getter branch.
- **Reason**: Root-cause fix in one shared place rather than patching two
  independent copies of the same bug; prevents a third copy of the same
  bug appearing in a future importer.
- **Consequences**: Any *new* Excel importer that reads a date cell must
  use `excelDateCellToISO`, not re-derive its own formatting.
- **Files**: `lib/table-columns.ts`, `components/ApartmentExcelImport.tsx`,
  `components/BesiktningarExcelImportDialog.tsx`.

---

## Money/reduction fields are normalized with `Math.abs()` at parse time, not by relaxing validation

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: Source spreadsheets commonly store a rent reduction
  (`hyresrabatt`/`hyresreduktion`) as a negative number. The server-side
  validator (`sanitizeApartmentInput` in `app/lediga-lagenheter/actions.ts`)
  rejects any negative numeric field as invalid. `RentalObjectExcelImport.tsx`
  already applied `Math.abs()` to this exact kind of field;
  `ApartmentExcelImport.tsx` initially did not, and was verified (against a
  real user file) to reject 29 of 64 otherwise-valid rows because of it.
- **Decision**: Apply `Math.abs()` to `hyresrabatt`/`hyresreduktion` at
  parse time in `ApartmentExcelImport.tsx`, matching the existing
  `RentalObjectExcelImport.tsx` convention, rather than loosening the
  server-side `value < 0` check.
- **Reason**: The magnitude is the meaningful value app-wide (see
  `RentalObjectExcelImport.tsx`'s existing precedent); loosening server
  validation would let a genuinely-wrong negative value (e.g. a typo)
  through unnoticed elsewhere (manual form entry, other callers).
- **Consequences**: Any new import path for a reduction-like field should
  normalize sign at parse time, not touch `sanitizeApartmentInput`'s
  non-negative check.
- **Files**: `components/ApartmentExcelImport.tsx`.

---

## Excel-import skip reasons are shown per row, not just as a count

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: The apartments Excel-import dialog originally showed only a
  bare "N rader hoppades över" count for both client-side parse skips and
  server-side sanitize rejections, which made a real bug (rows rejected for
  a negative-number field) indistinguishable from expected noise (blank
  spreadsheet padding rows).
- **Decision**: `parseRows` in `ApartmentExcelImport.tsx` returns
  `skippedDetails: Array<{ lagenhetsnummer, reason }>` for any row with a
  non-blank lägenhetsnummer (fully blank padding rows are counted
  separately, not listed individually, to avoid flooding the UI on sheets
  with tens of thousands of blank rows). `importApartmentsFromExcelAction`
  (`app/lediga-lagenheter/actions.ts`) likewise returns
  `skippedDetails` with the actual thrown error message per rejected row.
  Both are shown behind a clickable "Visa N överhoppade rader" chip.
- **Reason**: Direct response to a real diagnosis problem hit during this
  work — a skip count alone was not enough to distinguish "expected" from
  "a real bug," for either the user or the agent.
- **Consequences**: Any future Excel importer should surface skip reasons
  the same way, not just a count, if it's expected to see real-world
  spreadsheets with mixed-quality data.
- **Files**: `components/ApartmentExcelImport.tsx`,
  `app/lediga-lagenheter/actions.ts`.

---

## Responsive data views share one filtered and paginated row set

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: Desktop tables were useful but caused horizontal scrolling on
  phones, while a 25-row default made screens unnecessarily long.
- **Decision**: Keep MUI tables on larger screens and render rows as labeled
  MUI cards on phones. Both views share search, sort, page, and rows-per-page
  state, defaulting to 10. Excel previews reuse `ResponsivePreview`.
- **Reason**: Preserves desktop scanability without duplicating data logic.
- **Consequences**: New row-oriented screens must not maintain independent
  desktop/mobile pagination.
- **Files**: `components/*Table.tsx`, `components/ResponsivePreview.tsx`,
  `app/mallar/page.tsx`, `components/AdminUsersPanel.tsx`.

---

## Desktop navigation is a left rail; mobile navigation remains a drawer

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: The top navigation competed with page actions and did not
  scale cleanly across the application's many destinations.
- **Decision**: Use a persistent 272 px MUI drawer on desktop, grouped by
  work area, collapsible to a 72 px icon rail, and a temporary drawer opened
  from a compact app bar on phones. The collapsed preference is session-local
  and resets on a full reload.
- **Reason**: Keeps destinations visible without consuming vertical working
  space and reuses existing nav-link and role filtering logic.
- **Consequences**: New routes belong in the existing nav structure and an
  existing work-area group where possible.
- **Files**: `components/NavBar.tsx`, `app/layout.tsx`,
  `app/_components/nav-grid.tsx`.

---

## Statistik gained a "bostäder per typ" chart and a "lägenheter per status" chart, kept as a symmetric pair

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: The user wanted a chart of how many rental objects exist per
  `RentalObject.typ` value (e.g. `korridorrum`, `lägenhet`, `dubblett`,
  `pentry`) — free text set at import time, not a fixed enum. Adding one
  chart would have made the `Statistik` grid's last row asymmetric (7 cards
  instead of an even number), so a second chart was added alongside it.
  First attempt paired it with a `getPlanritningstackning` floor-plan-coverage
  donut; the user explicitly rejected that metric as "a bad metric" (a
  data-completeness stat, not something actionable) and asked for
  alternatives. Replaced with the user's pick from that list.
- **Decision**: `getBestandsoversikt` (`lib/statistik.ts`) now also returns
  `bostaderPerTyp` (grouped by trimmed `typ`, blank falls back to "Okänt",
  sorted by count descending), rendered as a `BarChart` next to "Bostäder
  per fastighet". A new `getLagenheterPerStatus(vacantApartments)` counts
  `Apartment.status` (the fixed `ApartmentStatus` enum, not free text) across
  the already-fetched `vacantApartments` array (which already excludes
  `arkiverad`), ordered `ledig → kontaktad → redo_for_kontrakt` to read as
  the leasing funnel, rendered as a `BarChart` titled "Lägenheter per
  status".
- **Reason**: Matches the existing `bostaderPerFastighet` bar-chart pattern
  (reuse over invention). `lagenheterPerStatus` was chosen over the
  rejected floor-plan metric because it's actionable pipeline visibility,
  uses a fixed enum (no data-quality risk the way `typ` has), and needed no
  new data fetch (`vacantApartments` was already loaded for `Uthyrningsgrad`).
- **Consequences**: Real `LND` data shows `typ` has inconsistent casing and
  placeholder-looking values (`"Dubblett"` vs `"dubblett"` counted as
  separate categories; bare `"1"`/`"2"` values with no clear meaning) — this
  is a source-data quality issue surfaced by the new chart, not a bug in it.
  See `docs/TODO.md`. Separately, `lagenheterPerStatus` may render as a
  single short bar if a nation currently has no apartments in `kontaktad`/
  `redo_for_kontrakt` — expected given real, sparse pipeline data, not a bug,
  though it can look visually unbalanced next to a taller sibling card in
  the same grid row.
- **Files**: `lib/statistik.ts`, `components/StatistikOverview.tsx`,
  `app/statistik/page.tsx`.

---

## `DonutChart`'s segment `<title>` must be one template-string child, not a JSX text/expression mix

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: While adding a (since-replaced, see the decision above) floor-
  plan-coverage donut chart and verifying it in a real authenticated browser
  session (the first time any agent had browser access during this whole
  responsive-redesign milestone), a hydration error appeared: `<title>
  {s.label}: {s.value}}
  </title>` in `components/charts/DonutChart.tsx` produces a 3-child JSX
  array (`s.label`, `": "`, `s.value`), which React cannot serialize
  identically between SSR and hydration for a `<title>` element (confirmed
  via the exact server-side React warning: "React expects the `children`
  prop of `<title>` tags to be a string... found an Array with length 3").
  This is a pre-existing bug affecting every `DonutChart` usage, including
  the already-shipped `Uthyrningsgrad` chart — it had simply never been
  rendered in a real browser before.
- **Decision**: Changed the `<title>` to a single template-string child:
  `` <title>{`${s.label}: ${s.value}`}</title> ``. Fixed once in the shared
  component rather than in each chart that uses it.
- **Reason**: Root-cause fix matches ponytail's rule — one guard/fix in the
  shared function beats patching every caller, and every current and future
  `DonutChart` caller is affected identically.
- **Consequences**: Any future SVG `<title>`/`<text>` content in this
  codebase should use a single template-string child, not multiple
  JSX children, to avoid the same class of hydration bug.
- **Files**: `components/charts/DonutChart.tsx`.

---

## Residents are explicit and are included in total tenant statistics

- **Date**: 2026-08-04
- **Status**: accepted
- **Context**: The `andrahandsgaster` collection represented both genuine
  second-hand tenants and residents without distinguishing them.
- **Decision**: Add `typ: "andrahandsgast" | "inneboende"` throughout the
  model and UI. Treat missing legacy values as `andrahandsgast`. Total
  tenants are primary tenants plus `inneboende`; second-hand tenants are
  reported separately.
- **Reason**: Matches the user's operational definition without migrating or
  misclassifying existing records.
- **Consequences**: Imports default to `andrahandsgast` until explicitly
  changed. Statistics must preserve the fallback and counting rule.
- **Files**: `lib/andrahandsgaster.ts`, `app/hyresgastlista/actions.ts`,
  `components/AndrahandsgastFormDialog.tsx`,
  `components/AndrahandsgasterTable.tsx`, `lib/statistik.ts`,
  `components/StatistikOverview.tsx`.
