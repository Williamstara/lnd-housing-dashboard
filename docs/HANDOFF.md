# Handoff

Short-lived. Replace this file's content after every meaningful work
session — it is not a history log (see `docs/DECISIONS.md` for durable
history and `git log` for commit history once things are committed).

---

## Current objective

Set up a durable, model-neutral project memory/handoff system
(`AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/SESSION.md`,
`docs/HANDOFF.md`, `docs/DECISIONS.md`, `docs/TODO.md`) so Claude Code and
OpenAI Codex can alternate work on this repository, capturing the state of
the "apartments Excel import" milestone (see `docs/SESSION.md`) that was
in progress immediately beforehand.

## Completed work

- Diagnosed and fixed tenant/andrahandsgäst/rental-object Excel imports
  silently dropping every row (stale hardcoded fastighet-name map);
  replaced with an admin-configurable, per-nation fastighet-alias system.
- Built a full "Importera från Excel" feature for Lediga lägenheter
  (apartments), which previously had none: server action, bulk upsert,
  dialog with multi-sheet picker, admin column-mapping editor.
- Added per-fastighet lägenhetsnummer-prefixes (`/fastigheter`, admin
  editable) and prefix-based fastighet resolution for the apartments
  importer.
- Added optional tenant-interest columns (Hyresgäst, Personnummer, E-post,
  Telefon, Kontonummer) to the apartments importer.
- Fixed an Excel date-cell timezone bug (off-by-one day) shared between the
  apartments and besiktningar importers.
- Fixed the apartments importer rejecting valid rows with a negative
  hyresrabatt/hyresreduktion value.
- Added per-row skip-reason visibility (client parse + server sanitize) to
  the apartments importer.
- Created this documentation system.

Full reasoning for each of the above (except the documentation system
itself) is in `docs/DECISIONS.md`. Outstanding follow-ups are in
`docs/TODO.md`.

## Files changed (uncommitted, working tree)

Modified (14):
`AGENTS.md`, `CLAUDE.md`, `app/admin/actions.ts`,
`app/fastigheter/actions.ts`, `app/lediga-lagenheter/actions.ts`,
`app/lediga-lagenheter/page.tsx`, `components/AdminPage.tsx`,
`components/ApartmentsTable.tsx`,
`components/BesiktningarExcelImportDialog.tsx`,
`components/FastigheterTable.tsx`, `lib/apartments.ts`,
`lib/fastigheter.ts`, `lib/nation-settings.ts`, `lib/table-columns.ts`.

Untracked, part of this work: `components/ApartmentExcelImport.tsx`,
`docs/` (this documentation system).

Untracked, **not** part of this work (pre-existing before this session,
left as-is): `.agents/` (vendored skill definitions), `skills-lock.json`
(skills tooling lockfile).

`git diff --stat` at time of writing: 14 files changed, 673 insertions(+),
27 deletions(-) (excludes untracked files, which git diff doesn't show).

## Actual validation results

Run at the time of this handoff:

- `npx tsc --noEmit` → **clean, no output, exit 0.**
- `npm run lint` → **7 pre-existing errors + 1 pre-existing warning**, all
  `react-hooks/set-state-in-effect` except one unused-var warning, in files
  this session did not introduce the pattern in:
  - `app/mallar/page.tsx:44`
  - `app/planritningar/page.tsx:38`
  - `components/AdminPage.tsx:635` (pre-existing effect, not the new
    `FastighetAliasEditor`/apartments-mapping code added this session)
  - `components/email/QuarterDateTimePicker.tsx:21`
  - `components/email/RenamePlanDialog.tsx:24`
  - `components/email/TemplateEditorDialog.tsx:47`
  - `lib/use-column-visibility.ts:16`
  - `lib/auth0.ts:12` (warning: unused `_idToken`)
  
  None of these are new regressions from this session. See
  `docs/TODO.md`'s "Later" section.
- Data-transformation logic (fastighet-prefix resolution, date parsing,
  numeric sign normalization, skip-reason reporting) was verified against
  the user's real `.xlsx` files with throwaway Node scripts (not committed,
  not present in the repo) and against direct MongoDB queries against
  nation `LND`'s actual documents. Not re-run as part of this
  documentation pass — see `docs/DECISIONS.md` for the specific verified
  numbers (e.g. "64/64 rows now pass server-side validation, was 35/64").
- No UI re-verification (dev server / browser) was done in this
  documentation pass; it was done earlier in the same work (see
  `docs/DECISIONS.md`).

## Current repository and working-tree state

- Branch: `main`, up to date with `origin/main`.
- Working tree: **dirty** (see "Files changed" above). Nothing staged.
  **Nothing from this work has been committed.**
- Other local branches exist (`Cookies-and-policies`, `admin-page`) — not
  touched, not relevant to this work.
- No merge/rebase in progress.

## Remaining work

See `docs/TODO.md` for the full, current list. Highest-priority items:

1. User needs to save the apartments Excel-import column mapping in Admin
   → Import-mappningar → Lediga lägenheter (exact columns in
   `docs/TODO.md`). This is a **user action**, not code.
2. Decide whether/when to commit the uncommitted work listed above — ask
   before committing, per this repo's established norm.

## Blockers

None on the coding side. The apartments-import milestone is feature-complete
and verified; it is blocked only on the user performing the admin
configuration step described above.

## Exact recommended next step

If resuming this work: check whether the user has saved the apartments
import mapping (`GET` the `nations` collection document for nation `LND`,
field `imports.apartments`, or ask the user directly) and whether they've
re-tested the import. If they report a new problem, start by re-verifying
against their current real file with a throwaway script (see `AGENTS.md`'s
validation requirements) rather than assuming the previously-diagnosed
causes are the same ones.

If starting unrelated work instead: this milestone can be considered closed
pending user confirmation — proceed with whatever the user asks next,
following the Standard Agent Workflow in `AGENTS.md`.

## Relevant commands

```bash
npx tsc --noEmit
npm run lint
npm run dev
git status
git diff --stat
```

## Timestamp

2026-08-04

## Agent

Claude Code (Sonnet 5)
