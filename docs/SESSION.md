# Current session / milestone

This file holds the current milestone's working memory. Replace it when the
milestone changes; durable reasoning belongs in `docs/DECISIONS.md`.

## Current milestone

**Complete.** Migrated the app's database from MongoDB to Supabase
(Postgres), on branch `mongodb-to-supabase-ref`. Auth0 stayed the identity/
roles/tenant system of record throughout — this was not a switch to
Supabase Auth. Full design (schema/RLS/phasing) is preserved in
`docs/DECISIONS.md`; the original planning document lived at
`~/.claude/plans/serene-pondering-bengio.md` on the machine this session ran
on (local to that machine, not part of the repo).

## User problem being solved

The app was pre-production with one real tenant (`LND`). MongoDB had no
schema enforcement and no DB-level tenant-isolation guarantee (every query
was manually filtered by `nationsID` in application code — a forgotten
filter would have been a silent cross-tenant leak, not an error). Postgres
adds real foreign keys/constraints and Row Level Security as a fail-closed
tenant-isolation backstop.

## Implemented scope

All four phases complete:

- **Phase 0 (Supabase project setup)**: schema, RLS, and Storage
  buckets/policies applied via versioned migrations in
  `supabase/migrations/` (four files — schema, RLS, storage, grants — see
  `docs/DECISIONS.md` for why a separate grants migration was needed). Auth0
  registered as a Supabase Third-Party Auth issuer.
- **Phase 1 (data migration)**: all real `LND` data moved from MongoDB to
  Postgres via a throwaway script (written, run, verified, then deleted per
  `AGENTS.md` convention — nothing left in the working tree from it). Row
  counts and field-level spot-checks confirmed correct, including all 291
  floor-plan files round-tripping through Supabase Storage.
- **Phase 2 (proof of concept)**: `lib/supabase-server.ts` built,
  `lib/fastigheter.ts` converted first and verified live. Found and fixed
  two non-obvious blockers along the way (both documented in
  `docs/DECISIONS.md`): missing default `GRANT`s on SQL-migration-created
  tables, and Auth0's ID token needing an explicit `role: "authenticated"`
  custom claim for Supabase's Third-Party Auth to map requests to the
  `authenticated` Postgres role instead of silently falling back to `anon`.
- **Phase 3 (convert remaining files)**: every other `lib/*.ts` file
  converted one at a time, each verified live in the browser before moving
  to the next — `tenants.ts`, `andrahandsgaster.ts`, `apartments.ts`,
  `rentalobjects.ts`, `missed-rent.ts` (hit and fixed a real cross-database
  ID-type mismatch on `/lediga-lagenheter` — see `docs/DECISIONS.md`),
  `besiktningar.ts`, `todos.ts` (normalized `subtasks` into a
  `todo_subtasks` child table with a completion-sync trigger replacing the
  old manual re-check), `gmail-tokens.ts`, `nation-settings.ts` (also
  simplified `listAllNationIds()` — `nations` is now a real registry table,
  not inferred by scanning every collection), `mail-templates.ts`/
  `floor-plans.ts`/`uppsagningar.ts` (Storage-backed blobs), and
  `recipient-groups.ts`.
- **Phase 4 (cutover)**: `mongodb` and the unused `@supabase/ssr` dependency
  removed; `lib/mongodb.ts` deleted; `MONGODB_URI`/`MONGODB_DB` removed from
  `.env.local`; `AGENTS.md` and `docs/ARCHITECTURE.md` rewritten to describe
  the Postgres/Supabase architecture. Full `npx next build` succeeds (needed
  a larger Node heap on this machine — `NODE_OPTIONS=--max-old-space-size=8192
  npx next build` — the default limit isn't enough for this build's
  type-checking phase; unrelated to the migration itself).

## Validation status

- `npx tsc --noEmit`: clean throughout every phase.
- `npm run lint`: unchanged baseline (7 `react-hooks/set-state-in-effect`
  errors + 1 unused-arg warning) throughout.
- `npx next build`: clean (with the heap-size flag above).
- Every route in the app has been verified live in a real authenticated
  browser session against real `LND` data on Postgres: `/fastigheter`,
  `/hyresgastlista` (both tabs), `/lediga-lagenheter`, `/redo-for-kontrakt`,
  `/databas`, `/statistik`, `/besiktningar`, `/todo` (including the
  subtask-completion trigger), `/admin` (both tabs), `/profil`,
  `/planritningar`, `/mallar`, `/uppsagning`.

## Acceptance criteria

- [x] Phase 0: schema, RLS, Storage buckets live on the real project.
- [x] Phase 1: all Mongo data migrated and verified.
- [x] Phase 2: one collection (`fastigheter`) converted and verified live.
- [x] Phase 3: every remaining `lib/*.ts` file converted, each verified live.
- [x] Phase 4: MongoDB fully removed; docs updated.

## Exact next step

None outstanding for this migration. Remaining items are pre-existing,
unrelated work already tracked in `docs/TODO.md` (the responsive-UX QA
pass, `RentalObject.typ` data-quality cleanup, apartments Excel-import
mapping) — worth a quick sanity pass on the Postgres-backed app since they
predate this migration, but nothing about them is migration-specific.

## Out-of-milestone notes

- **A MongoDB connection string with an embedded password was accidentally
  printed into agent tool output twice during this session** (once from an
  unsafe `source .env.local` in a shell command, once from an unquoted
  `grep` before `.env.local` was edited to remove the Mongo lines). The
  corresponding Atlas database user should be rotated or deleted — flagged
  to the user both times it happened; recorded here and in `AGENTS.md` so
  it isn't lost. Given MongoDB is now fully decommissioned for this app,
  deleting the Atlas database user (rather than rotating its password) is
  the simpler cleanup.
- A dev server was left running in the background during this session on
  the machine this ran on (`npm run dev`, logging to
  `/tmp/lnd-dev-server.log`) for live verification. Check whether it's
  still needed/running before starting a fresh one.
