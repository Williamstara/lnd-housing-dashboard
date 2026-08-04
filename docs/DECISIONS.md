# Decisions

Durable, non-obvious decisions that a future agent might otherwise
accidentally reverse. Only decisions verified from this repository's actual
code/history or from direct work done in an agent session are recorded here
— no invented historical rationale. See `AGENTS.md` for how this file is
maintained.

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
