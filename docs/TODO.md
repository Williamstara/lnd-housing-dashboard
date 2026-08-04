# TODO

Concrete, verified work only. See `docs/HANDOFF.md` for the exact next step
and repository state, and `docs/DECISIONS.md` for the reasoning behind
several of these.

## Next

- **User must save the apartments Excel-import column mapping in Admin →
  Import-mappningar → Lediga lägenheter.** Verified via direct query against
  the `nations` collection that `imports.apartments` is still `undefined`
  for nation `LND` as of the last check. For the user's real sheet
  ("Lediga (kladd)" tab of `Lägenheter att tillsätta .xlsx`), the correct
  columns are:
  Lägenhetsnummer=A, Storlek=B, Objekttyp=C, Antal rum=D, Ledig fr.o.m.=E,
  Årshyra=F, Hyresrabatt=*(leave blank — no such column)*,
  Hyresreduktion=G, Årshyra med red.=H, Månadshyra=N,
  Hyresgäst (intresserad)=I, Personnummer=J, E-post=K, Telefon=L,
  Kontonummer=M.
  **Acceptance criteria**: after saving, importing that sheet/tab yields the
  64 valid apartment rows (verified count against the real file) with
  Hyresgäst/Personnummer/etc. populated in the preview, and no
  server-side rejections.
- **Commit the uncommitted work from the last session.** `git status` shows
  12 modified tracked files and 2 untracked (`components/ApartmentExcelImport.tsx`,
  `docs/` itself) — nothing staged or committed. See `docs/HANDOFF.md` for
  the exact file list. This repo's convention is to ask before committing —
  don't commit without being asked.

## Later

- **Fix the stale fastighet-name lookup tables in `lib/laundry-account.ts`
  and `lib/rentalobjects.ts`.** `FASTIGHET_BUILDING`,
  `FASTIGHET_LAUNDRY_BUILDING` (`lib/laundry-account.ts`) and
  `FASTIGHET_PREFIXES` (`lib/rentalobjects.ts`) use an obsolete long-form
  naming scheme (e.g. `"Arkivet (223 59, Lund)"`) as dictionary keys, which
  no longer matches the short names in the `fastigheter` collection (e.g.
  `"Arkivet"`). Deliberately deferred once already — see "Deferred: stale
  fastighet naming" in `docs/DECISIONS.md`.
  **Acceptance criteria**: `createLaundryAccount` succeeds (not
  `"Okänd fastighet"`) for a tenant in Sankt Thomas 35, 39, or 39 B, not
  just Arkivet; `findRentalObjectForApartment`'s prefix fallback in
  `lib/rentalobjects.ts` resolves for those buildings too. Consider
  resolving via the now-existing `fastigheter.prefixes` data instead of a
  third hardcoded table.
- **Add `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET` to `.env.local.example`.**
  Both are read in code (`app/api/auth/gmail/*`, verified via
  `grep -r process.env`) but missing from the example file, unlike every
  other env var actually used.
  **Acceptance criteria**: `.env.local.example` lists every env var the
  grep in `AGENTS.md`'s "Security and data-handling rules" section names.
- **Consolidate duplicated Excel cell-parsing helpers.** Five importer
  dialogs (`ExcelImportDialog.tsx`, `AndrahandsgastExcelImportDialog.tsx`,
  `BesiktningarExcelImportDialog.tsx`, `ApartmentExcelImport.tsx`,
  `RentalObjectExcelImport.tsx`) each define their own local
  `cellStr`/`cellNum`(-equivalent) helpers. Only date-cell formatting
  (`excelDateCellToISO`) and fastighet-name resolution have been shared so
  far. Not urgent — no known bug currently caused by the duplication, just
  future-bug risk.
- **Clean up the pre-existing `react-hooks/set-state-in-effect` lint
  errors.** `npm run lint` reports 7 errors of this kind (calling
  `setState` synchronously inside a `useEffect` body) in:
  `app/mallar/page.tsx:44`, `app/planritningar/page.tsx:38`,
  `components/AdminPage.tsx:635`,
  `components/email/QuarterDateTimePicker.tsx:21`,
  `components/email/RenamePlanDialog.tsx:24`,
  `components/email/TemplateEditorDialog.tsx:47`,
  `lib/use-column-visibility.ts:16`. Pre-existing, not introduced by recent
  work — likely a newly-stricter lint rule flagging an established data-
  loading pattern used throughout the codebase. Needs a decision on the
  right replacement pattern (e.g. `useEffect` + a stable async function,
  vs. deriving state without an effect) before fixing all seven
  consistently.
- **Fix the unused `_idToken` parameter warning in `lib/auth0.ts:12`.**
  Trivial; low priority.

## Blocked

- None currently identified.

## Completed recently

(Uncommitted as of the last check — see `docs/HANDOFF.md` for exact
validation. Listed here so nobody re-does this work; move to a change log
or drop once committed and this becomes redundant with `git log`.)

- Fixed tenant / andrahandsgäst / rental-object Excel imports silently
  dropping every row due to a stale hardcoded fastighet-name map; replaced
  with an admin-configurable, per-nation fastighet-alias table.
- Added a multi-sheet picker to the apartments Excel-import dialog (and
  confirmed the sheet-listing approach works against a real 24-tab
  workbook).
- Built the full "Importera från Excel" feature for Lediga lägenheter
  (apartments had none before), including admin-side column-mapping
  configuration (Admin → Import-mappningar → Lediga lägenheter).
- Added per-fastighet lägenhetsnummer-prefixes (admin-editable on
  `/fastigheter`) and prefix-based fastighet resolution for the apartments
  importer, since a reliable Fastighet column isn't available in the
  target sheet.
- Added optional tenant-interest columns (Hyresgäst, Personnummer, E-post,
  Telefon, Kontonummer) to the apartments importer, reusing the existing
  "spara intresse" data shape.
- Fixed an Excel date-cell off-by-one-day bug caused by reading a
  SheetJS-parsed date with UTC getters instead of local getters; shared the
  fix (`excelDateCellToISO`) between the apartments and besiktningar
  importers.
- Fixed the apartments importer rejecting valid rows whose source sheet
  stored a rent reduction as a negative number, by normalizing sign at
  parse time (`Math.abs()`), matching the existing rental-objects importer
  convention.
- Added per-row skip-reason reporting (not just a count) to both the
  client-side parse step and the server-side sanitize step of the
  apartments importer.
- Set up this shared documentation system
  (`AGENTS.md`, `CLAUDE.md`, `docs/*`).
