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
