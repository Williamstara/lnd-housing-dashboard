# Handoff

Short-lived handoff for the next coding agent. Repository state and validation
were verified immediately before writing this file.

## Current objective

The application-wide responsive UX remake (left nav rail, mobile cards,
10-item pagination, standardized dialogs) is functionally complete but still
needs authenticated rendered QA at tablet/phone widths — see `docs/TODO.md`.
This session did a mix of new small features on top of that milestone
(statistik charts, besiktningar bulk tooling, missed-rent sourcing) rather
than continuing the QA pass itself.

## Completed this session

1. **`/statistik` chart grid** (6→8 cards, stays symmetric): added "Bostäder
   per typ" (bar) and, after two rounds of user feedback, "Lägenheter per
   status" (bar) — a floor-plan-coverage donut was tried first and
   explicitly rejected as "a bad metric".
2. **Fixed a real, pre-existing hydration bug** in
   `components/charts/DonutChart.tsx`: its segment `<title>` used
   `{s.label}: {s.value}` (an invalid multi-child JSX array for `<title>`).
   Affected every donut on the page, including the pre-existing
   `Uthyrningsgrad` chart — found via the first real browser check this
   milestone ever got. Fixed with a template string.
3. **`/besiktningar` bulk selection**: added a "select by besiktningsdatum"
   control. Went through three rounds of direct user correction — see
   `docs/DECISIONS.md` for the blow-by-blow — ending at: the date field's
   `onChange` directly replaces the selection (no separate button), holds
   through manual per-row edits, and — critically — **the three bulk action
   handlers no longer call `clearSelection()` on success**, so a user can
   run klar-för-betalning → betalning gjord → arkivera against one held
   selection without re-picking the date between steps. If you ever see a
   `clearSelection()`/`setSelectedIds(new Set())` reappear inside
   `bulkMarkKlarForBetalning`/`bulkMarkBetalningGjord`/`bulkArchive`, that's
   a regression of this exact fix.
4. **`/besiktningar` "Status" bar**: also went through three rounds (donut →
   a new hand-rolled `LineChart` → rejected → deleted → final: a plain MUI
   `Box`/`Stack` segmented/stacked progress bar, no chart component at all).
   `components/charts/LineChart.tsx` was created and removed within this
   session; if it exists in the tree, something went wrong.
5. **User reported a suspected bug**: bulk archive supposedly archiving
   unpaid besiktningar. Verified directly against the real database (a
   throwaway, deleted script) — all 175 archived rows had a
   `betalningGjordDatum`; the guard (`betalningGjordDatum: { $ne: null }`
   in `archiveBesiktningarBulk`) was working. Likely explanation: the user
   ran the full klar→betald→arkivera sequence enabled by item 3 above, which
   legitimately marks everything paid before archiving it.
6. **Removed `ekonomi` from besiktningar archiving specifically** (not
   deleting, not any other feature's `ARCHIVE_ROLES`). New
   `requireHusvdRole()` guard in `app/besiktningar/actions.ts`; split
   `BesiktningarTable.tsx`'s single `canArchive` flag into `canArchive`
   (husvd/admin) and `canDelete` (unchanged, ekonomi/husvd/admin).
7. **Missade hyror can now be added directly from Databas**, not just from
   Lediga lägenheter — rent can be missed for reasons other than vacancy
   (e.g. an occupied unit whose tenant didn't pay), and such units often
   have no `Apartment` record at all. `MissedRentDoc`/`MissedRentRow` now
   carry `apartmentId | null` and `rentalObjectId | null` (exactly one set)
   plus `manualLedigFrom` for the Databas case. New
   `getRentalObjectsByIds` (`lib/rentalobjects.ts`), new
   `createManualMissedRentFromRentalObject`/`...Action`, and a "Källa"
   select in `MissedRentTable.tsx`'s add dialog. Two call sites that assumed
   `apartmentId` was always a non-null string were found and fixed:
   `app/lediga-lagenheter/page.tsx` and `lib/statistik.ts`'s
   `getUthyrningsgrad`.
8. **Fixed `scripts/check-statistik.mjs`**, found broken by item 1 above —
   its synthetic fixtures had no `typ` field, so `npm run check:statistik`
   was silently failing. Added `typ` to the fixtures and a `bostaderPerTyp`
   assertion; it passes again.
9. Installed the three vendored skills `AGENTS.md`'s Skills policy expects
   in `.agents/skills/` (`frontend-design`, `vercel-react-best-practices`,
   `web-design-guidelines`) — matched what `skills-lock.json` already
   tracked, no diff.
10. **Besiktningar gained a shared "Övriga anteckningar" field** — any
    authenticated nation user can fill it in (husförman/husvd/ekonomi all
    included), same as the two existing note fields; no new role gate was
    needed since editing besiktningar was never role-restricted to begin
    with (only payment-marking and archive/delete are). Added
    `ovrigaAnteckningar: string` to `Besiktning`/`BesiktningEditInput`
    (`lib/besiktningar.ts`, defaulted to `""` for existing rows via `??`),
    wired through `BesiktningarTable.tsx`'s add/edit dialogs, both table
    views, search, and `BesiktningarExcelImportDialog.tsx` (always `""` —
    no column mapping exists for it), plus a read-only column in
    `ArkivBesiktningarTable.tsx`.
11. **Extracted `components/charts/SegmentedBar.tsx`** from item 4's inline
    status-bar JSX in `BesiktningarTable.tsx` (now the first consumer, still
    a plain count, no formatter), and added a "Per ansvarig" breakdown of
    the same shape inside `/statistik`'s "Missade hyresintäkter" card (the
    second consumer). First pass had `getMissedRentByAnsvarig` count cases
    per ansvarig; user corrected — it should be the summed **kr amount**
    ("the estimated miss for that ansvarig, not the fkn amounts of
    misses"), not a count. Fixed: `getMissedRentByAnsvarig` now sums each
    row's `totalMissat` and returns `{label, total}[]`; `SegmentedBar`
    gained an optional `valueFormatter` prop (passed `kr` for this usage
    only) to render currency instead of a raw number. Free-text `ansvarig`
    blanks bucket into "Ingen ansvarig"; colored via `CATEGORICAL` (not
    `STATUS` — ansvarig names aren't a severity state).

See `docs/DECISIONS.md` for full context/reasoning on every item above.

## Validation status

- `npx tsc --noEmit --incremental false` — clean (checked repeatedly through
  the session, most recently after item 7).
- `npm run lint` — unchanged baseline: 7 `react-hooks/set-state-in-effect`
  errors + 1 unused-arg warning (same files/lines as prior sessions).
- `npm run check:statistik` — clean (was broken mid-session by item 1, fixed
  by item 8; passes now).
- Browser verification (Claude in Chrome) was solid for items 1–6 (real
  `LND` data, hard refreshes, console checks), then **broke down through
  item 7 and disconnected entirely by item 10** (`computer`/screenshot,
  `find`, and `read_page` returning errors, then "Browser extension is not
  connected") — an extension-side issue, not a page bug (console stayed
  clean, `get_page_text` kept working, `tsc` never flagged anything). The
  extension **reconnected during item 11** — screenshot capture is still
  broken (`Failed to deserialize params.clip.scale`), but navigation,
  `get_page_text`, and `read_console_messages` work again. Used those to
  verify item 11 with real data both before and after the count→kr
  correction: besiktningar Status bar still 37/8/10 after the
  `SegmentedBar` extraction; Missade hyresintäkter's "Per ansvarig" first
  showed case counts (5/4/3), then after the fix showed
  "Husförman 54 416 kr / Ekonomi 39 017 kr / Planerad miss 5 770 kr",
  summing to the card's own "99 203 kr" total — cross-checked the
  fully-visible "Ekonomi" bucket by hand against its 4 individual rows'
  `totalMissat` values, exact match — plus a hard refresh with a clean
  console. **Items 7's "Källa"/Databas-picker dialog and item 10's "Övriga
  anteckningar" field are still only verified by `tsc` + a manual `git
  diff` read-through, not visually** — worth a real look next session if
  the screenshot tool recovers, but not urgent given how the type-checker
  and diff review already confirmed every affected call site.
- No mutating bulk action (mark paid, archive) was ever clicked against real
  data during verification — only read-only checks, since those buttons
  affect real financial/business state. The one exception was the item-5
  investigation, which used a read-only, deleted throwaway script against
  the real DB (see `docs/DECISIONS.md`), never a mutation.

## Current Git and working-tree state

- Current branch: `main`. The user's GitHub Desktop appears to auto-commit
  this working directory in parallel with this session — branch moved
  `Design` → `dev` → `main` and two commits (`a4571f8`, `cd410f2`) appeared
  mid-session without any agent running `git commit`/`checkout`. Nothing was
  lost either time; always confirmed via `git diff <commit> -- <file>`
  before trusting a "this is committed" note.
- Working tree right now (items 7, 10, 11 + their fixes, not yet captured in
  a commit as of this writing): `app/lediga-lagenheter/page.tsx`,
  `app/statistik/actions.ts`, `app/statistik/page.tsx`,
  `components/ArkivBesiktningarTable.tsx`,
  `components/BesiktningarExcelImportDialog.tsx`,
  `components/BesiktningarTable.tsx`, `components/MissedRentTable.tsx`,
  `components/StatistikOverview.tsx`, `docs/DECISIONS.md`,
  `lib/besiktningar.ts`, `lib/missed-rent.ts`, `lib/rentalobjects.ts`,
  `lib/statistik.ts`, `scripts/check-statistik.mjs` are modified, and
  `components/charts/SegmentedBar.tsx` is a new untracked file — **check
  `git status` fresh, don't trust this list once time has passed.**
  `docs/HANDOFF.md`/`docs/SESSION.md` are being written now.
- No commit, merge, rebase, reset, or checkout was performed by any agent
  this session.

## Remaining work

1. (Low priority — already `tsc`/diff-verified) Visually confirm, once the
   screenshot tool recovers: (a) the missed-rent "Källa" toggle / Databas
   picker dialog in `MissedRentTable.tsx`; (b) the new "Övriga
   anteckningar" field's dialogs on `/besiktningar`.
2. Perform authenticated rendered QA at tablet (768 px) and phone (390 px)
   widths across the app (nav rail, mobile drawer, dialogs) — still nothing
   has had true phone-width screenshots this whole milestone.
3. Clean up the inconsistent `RentalObject.typ` values for nation `LND`
   (see `docs/TODO.md`) — a data fix via `/databas`, not a code change.
4. Save and re-test the apartments Excel-import mapping for nation `LND`
   (`docs/TODO.md`) — a user/environment action.
5. Commit the working tree only when explicitly requested.

## Blockers

- Browser extension screenshot capture is still broken (`Failed to
  deserialize params.clip.scale`) even after reconnecting — navigation,
  `get_page_text`, and `read_console_messages` all work fine. Not something
  to fix from the repo; try again next session, or ask the user to check
  the Claude in Chrome extension if it's still acting up.
- Native `<input type="date">` fields don't accept synthetic keystrokes
  reliably in this environment (digits spill across segments). Set `.value`
  via `javascript_tool` and dispatch `input`/`change` events instead —
  worked reliably every time it was used this session.

## Timestamp

2026-08-04 (local, per this session's clock)

## Current agent

Claude Code
