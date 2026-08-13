# Handoff

Short-lived handoff for the next coding agent. Repository state and validation
were verified immediately before writing this file.

## Current objective

None — the Mongo→Supabase migration (see `docs/SESSION.md`) is complete and
verified, and a follow-on SaaS-readiness roadmap + security audit
(`docs/SAAS-READINESS-ROADMAP.md`, see `docs/SESSION.md`'s "Follow-on work
this session" section) has also been written. The next objective is
whatever the user asks for next; the pre-existing, unrelated items in
`docs/TODO.md` (responsive-UX QA pass, `RentalObject.typ` data cleanup,
apartments Excel-import mapping) are still outstanding and predate this
migration — and everything in `docs/SAAS-READINESS-ROADMAP.md` is planned,
not implemented.

## Completed this session

The full four-phase Mongo→Supabase migration — see `docs/SESSION.md` for the
complete phase-by-phase breakdown and `docs/DECISIONS.md` for the specific
non-obvious blockers hit and fixed along the way:

1. Schema, RLS, and Storage buckets applied to the live Supabase project via
   four versioned migrations in `supabase/migrations/`.
2. All real `LND` MongoDB data migrated to Postgres (throwaway script,
   verified, then deleted).
3. Every `lib/*.ts` file converted from the MongoDB driver to
   `@supabase/supabase-js`, one at a time, each verified live in the browser
   before moving to the next.
4. Full cutover: `mongodb` dependency removed, `lib/mongodb.ts` deleted,
   `MONGODB_URI`/`MONGODB_DB` removed from `.env.local`, `AGENTS.md` and
   `docs/ARCHITECTURE.md` rewritten for the new stack.

**Read `docs/DECISIONS.md`'s 2026-08-13 entries before touching Supabase
client setup, RLS, or table grants again** — three genuinely non-obvious
blockers are documented there (missing default `GRANT`s on
migration-created tables, the `role: "authenticated"` Auth0 claim
requirement, and `@supabase/ssr` being incompatible with third-party
`accessToken` mode) that are easy to rediscover the hard way otherwise.

5. After the migration was verified, wrote `docs/SAAS-READINESS-ROADMAP.md`
   — a 7-tier "what's hardcoded/too coupled to LND's specific workflow"
   roadmap (from two parallel codebase audits) plus a full security audit
   as its final section (3-phase identify/filter/confidence-gate process,
   zero confirmed vulnerabilities, one non-urgent hardening recommendation
   re: raw Postgres errors reaching the browser). Purely planning — nothing
   in that file has been implemented. `docs/TODO.md` points to it.

## Validation status

- `npx tsc --noEmit` — clean.
- `npm run lint` — unchanged baseline (7 `react-hooks/set-state-in-effect`
  errors + 1 unused-arg warning).
- `npx next build` — clean, but needed a larger Node heap on this machine:
  `NODE_OPTIONS=--max-old-space-size=8192 npx next build`. The default heap
  limit isn't enough for this build's type-checking phase on this machine —
  unrelated to the migration, but worth knowing if a build mysteriously
  OOMs (`FATAL ERROR: ... JavaScript heap out of memory`) again.
- Every route in the app verified live in a real authenticated browser
  session against real `LND` data on Postgres — see `docs/SESSION.md` for
  the full list.

## Current Git and working-tree state

**Nothing has been committed.** Everything from this entire migration is
still uncommitted working-tree changes. Run `git status` for the exact
current list — as of this writing it includes (non-exhaustively): every
`lib/*.ts` file except `lib/theme.ts`/`lib/mail-utils.ts`/etc. (the
never-touched-DB pure-logic files), `lib/supabase-server.ts` (new),
`lib/mongodb.ts` (deleted), `supabase/` (new — CLI scaffold + 4 migration
files), `package.json`/`package-lock.json`, `app/hyresgastlista/page.tsx`
(one error-message string), `.env.local` (Mongo vars removed — not
committed anyway, it's gitignored), `AGENTS.md`, `docs/SESSION.md`,
`docs/HANDOFF.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`.

A dev server (`npm run dev`) was left running in the background on the
machine this session ran on, logging to `/tmp/lnd-dev-server.log`.

## Remaining work

1. **Rotate or delete the MongoDB Atlas database user.** Its connection
   string (with password) was accidentally printed into agent tool output
   twice during this session (see `docs/SESSION.md`'s "Out-of-milestone
   notes" and the corresponding `AGENTS.md` note). Since MongoDB is fully
   decommissioned for this app, deleting the Atlas user is simpler than
   rotating its password.
2. Commit the working tree — only when the user explicitly asks. Given the
   scale of this change (every `lib/*.ts` file, new migration files,
   deleted `lib/mongodb.ts`, rewritten `AGENTS.md`/`docs/ARCHITECTURE.md`),
   confirm with the user whether they want this as one commit or several
   before running `git add`/`git commit`.
3. The pre-existing items in `docs/TODO.md` (responsive-UX QA pass at
   tablet/phone widths, `RentalObject.typ` data-quality cleanup, apartments
   Excel-import mapping for `LND`) are unrelated to this migration and
   still outstanding — worth a quick sanity pass now that the app runs on
   Postgres, but nothing about them changed because of the migration.
4. Optional, low-priority: `docs/DECISIONS.md`'s "stale fastighet naming in
   laundry-account.ts and rentalobjects.ts" entry is unaffected by this
   migration — those two files still carry their own hardcoded, stale
   fastighet-name lookup tables, deliberately not touched here (see the
   migration plan's explicit "flagged, not bundled" decision, preserved in
   the DECISIONS.md schema-design entries from this session).
5. `docs/SAAS-READINESS-ROADMAP.md` is the entry point for any future
   "make this sellable to a second organization" work — read it before
   re-auditing the codebase for hardcoded/LND-specific assumptions again.

## Blockers

None.

## Timestamp

2026-08-13 (local, per this session's clock)

## Current agent

Claude Code
