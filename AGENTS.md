<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — LND Housing Dashboard

This is the model-neutral source of truth for any coding agent working in this
repository (Claude Code, OpenAI Codex, or otherwise). It is intentionally
vendor-neutral — no tool-specific instructions belong here. Claude-specific
instructions live in `CLAUDE.md` only.

## Project purpose

A Swedish student-housing management dashboard ("LND Housing Dashboard") for
a student nation in Lund (nationsID `LND` is the only tenant seen in the
database so far, though the data model is multi-tenant — see below). It
manages: available apartments ("Lediga lägenheter"), tenants and second-hand
tenants ("Hyresgästlista"), the full rental-object database ("Databas"),
inspections ("Besiktningar"), notices/terminations ("Uppsägning"), signed
contracts ("Arkiv"), buildings ("Fastigheter"), a shared todo list, statistics,
email templates and sending, and floor-plan storage. The UI is entirely in
Swedish; this file and the rest of `docs/` are in English.

## Repository structure

- `app/` — Next.js App Router. Each feature has a route folder with
  `page.tsx` (a Server Component that fetches data) and usually
  `actions.ts` (`"use server"` Server Actions). `app/api/**` holds Route
  Handlers for things a Server Action can't do (file downloads, Gmail OAuth
  redirects, webhook-style callbacks). `app/layout.tsx` is the root layout.
  `proxy.ts` (repository root) is this app's `middleware.ts` equivalent —
  see "Architectural constraints" below.
- `components/` — Client components (`"use client"`). Receive data fetched by
  the corresponding `page.tsx` as props; own local UI state (dialogs,
  pagination, search, forms) and call Server Actions. `components/charts/`
  and `components/email/` are feature subfolders.
- `lib/` — Data access and shared logic. Most files start with
  `import "server-only"` and own exactly one Postgres table (e.g.
  `lib/tenants.ts` ↔ `tenants` table). A few files are deliberately
  **not** server-only because client components import them directly for
  pure logic: `lib/table-columns.ts`, `lib/roles.ts`, `lib/nations.ts`,
  `lib/nav-links.tsx`, `lib/mail-utils.ts`, `lib/use-column-visibility.ts`.
- `scripts/` — One-off Node migration/data-quality scripts run manually
  (`backfill-nations-id.mjs`, `fix-data-quality.mjs`). Not part of the build.
- `docs/` — Shared agent memory (this system). See the links at the bottom.
- `public/` — Static assets.
- `LND-Dashboard/` — An unrelated personal Obsidian notes vault living inside
  this repo. Not part of the application. Do not edit or rely on it.

## Core technologies

- **Next.js 16.2.10** (App Router). Breaking changes vs. older Next.js exist
  — e.g. `middleware.ts` was renamed `proxy.ts`. Check
  `node_modules/next/dist/docs/` before assuming prior-version behavior.
- **React 19.2.4**, **TypeScript ^5** (`strict: true`, see `tsconfig.json`).
- **MUI v9** (`@mui/material`, `@mui/icons-material`, `@mui/material-nextjs`)
  is the UI component library — see the Material UI policy below.
- **Tailwind CSS v4** is installed and imported in `app/globals.css`, and a
  handful of Tailwind utility classes are used in `app/layout.tsx` for the
  root `html`/`body` (e.g. `min-h-full flex flex-col`). This predates the
  current MUI-first policy. Do not build new UI with Tailwind classes — see
  the Material UI policy below. `Needs verification`: whether removing
  Tailwind entirely is intended; treat the existing root-layout usage as
  legacy, not precedent.
- **Supabase (Postgres)** via `@supabase/supabase-js`'s plain `createClient`
  (`lib/supabase-server.ts`), talking to Supabase's Data API (PostgREST) —
  no ORM, no `@supabase/ssr` (installed but unused; see `docs/DECISIONS.md`
  for why `createServerClient` doesn't work with this app's auth setup).
  Schema lives in versioned migrations under `supabase/migrations/*.sql`,
  applied via `npx supabase db push --db-url "$SUPABASE_DB_URL"`. Tenant
  isolation is enforced by Postgres Row Level Security, not just app-layer
  filtering — see "Architectural constraints" below.
- **Auth0** (`@auth0/nextjs-auth0` v4) for authentication — this is the
  identity/roles/tenant system of record; Supabase is registered as a
  Third-Party Auth issuer for Auth0 and never runs its own native auth flow.
  Custom claims for roles and nationsID (multi-tenant scope) are injected by
  an Auth0 Action configured in the Auth0 tenant dashboard, **not
  version-controlled in this repository** — see `lib/roles.ts` and
  `lib/nations.ts` for the exact claim names and the expected Action shape
  (documented in code comments there). That same Action must also set a
  plain, non-namespaced `role: "authenticated"` claim for Supabase's
  Third-Party Auth to map requests to the `authenticated` Postgres role
  instead of silently falling back to `anon` — see `docs/DECISIONS.md`.
- **xlsx (SheetJS, ^0.18.5)** — all Excel import/export happens client-side
  in the browser (`FileReader` + `xlsx`); parsed rows are sent to a Server
  Action as plain JSON, not as a file upload to the server.
- **nodemailer + googleapis** — outgoing mail is sent via a Gmail OAuth2
  transport (`app/api/send-mail/route.ts`); refresh tokens are stored in the
  `gmail_tokens` table (`lib/gmail-tokens.ts`), keyed by Auth0 `sub`
  (per-user, not per-nation — the one table with no `nations_id`).

## Setup, development, test, lint, type-check, and build commands

```bash
npm install                # install dependencies
npm run dev                 # start the dev server (Next.js, default :3000)
npm run build                # production build
npm run start                 # run a production build
npm run lint                    # ESLint (eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit                 # type-check — there is no "typecheck" script in package.json, use this directly
```

**There is no automated test suite in this repository** — no test framework
is installed (no Jest/Vitest/Playwright/etc.), and `package.json` has no
`test` script. Do not invent or assume one exists. In practice, validation
for this codebase is:
1. `npx tsc --noEmit` (must be clean),
2. `npm run lint` (compare against the known pre-existing baseline in
   `docs/HANDOFF.md`/`docs/DECISIONS.md` — see below; don't assume every
   warning is yours to fix),
3. for data-transformation logic (Excel parsers, importers), a throwaway
   Node script that runs the real parsing logic against a **real** sample
   file is the established way to verify correctness — this has repeatedly
   caught bugs that looked fine on paper (see `docs/DECISIONS.md`). Delete
   throwaway scripts when done; do not commit them.
4. for UI changes, actually run `npm run dev` and check the feature in a
   browser — do not claim a UI change works from reading JSX alone.

As of the last verified run in this repository: `npx tsc --noEmit` is clean,
and `npm run lint` reports **7 pre-existing errors + 1 pre-existing warning**,
all `react-hooks/set-state-in-effect` (a stricter rule flagging
`setState()` calls made synchronously inside `useEffect`) plus one unused-arg
warning in `lib/auth0.ts`. None of these were introduced by the work
described in `docs/SESSION.md`/`docs/HANDOFF.md`. See `docs/HANDOFF.md` for
the exact file/line list at the time of the last handoff.

## Coding conventions

- Server-only data access lives in `lib/*.ts` behind `import "server-only"`;
  it owns exactly one Postgres table and exports typed CRUD functions built
  on `createSupabaseServerClient()` (`lib/supabase-server.ts`). Pure,
  client-safe helpers live in separate files with no `server-only`
  import so client components can import them directly (e.g.
  `lib/table-columns.ts` holds pure helpers; `lib/nation-settings.ts`
  re-exports them alongside the actual Supabase-touching CRUD).
- **Every nation-scoped table has a `nations_id text references
  nations(nations_id)` column**, and every query against it must filter on
  it explicitly (`.eq("nations_id", nationsId)`) even though Postgres Row
  Level Security also enforces this independently at the database layer —
  RLS is a fail-closed backstop (a missing filter returns zero rows, not a
  cross-tenant leak), not a replacement for the explicit filter. When adding
  a new nation-scoped table: add the column, a migration enabling RLS with
  the same tenant-isolation policy shape as every other table (see
  `supabase/migrations/20260812231542_rls.sql`), and grant `authenticated`
  the needed privileges (`supabase/migrations/20260813001732_grants.sql` —
  tables created via SQL migration don't get default grants the way
  dashboard-created tables do; see `docs/DECISIONS.md`).
- Server Actions live in `app/<route>/actions.ts`, marked `"use server"`.
  Pattern: resolve/require the caller's `nationsId` (and role, if
  restricted) first via `lib/nations.ts`/`lib/roles.ts` helpers, sanitize
  input, call the matching `lib/*.ts` function, then `revalidatePath(...)`
  every page the change affects.
- Client components receive server-fetched data as props from their
  route's `page.tsx` (a Server Component using `Promise.all` to fetch in
  parallel) — do not fetch data inside a `"use client"` component's own
  effect when a page prop would do.
- Admin-configurable, per-nation behavior (visible table columns, Excel
  import column mappings, fastighet name aliases, fastighet
  lägenhetsnummer-prefixes, rental-object multi-tab import groups) is stored
  as JSONB columns on the `nations` table (`NationSettings` type in
  `lib/table-columns.ts`) with a hardcoded `DEFAULT_*` fallback, so a nation
  with no saved settings behaves exactly as before the setting existed. Use
  the existing `resolveColumns`/`resolveImportMapping`/
  `resolveFastighetAliases`/`resolveTabGroups` helpers rather than inlining
  `saved ?? default` logic again.
- Excel importers (`components/*ExcelImportDialog.tsx`,
  `components/ApartmentExcelImport.tsx`,
  `components/RentalObjectExcelImport.tsx`) share one shape: pick file →
  (if the workbook has more than one sheet) pick a sheet → parse
  client-side with a per-row skip reason (not just a count) → preview table
  → confirm → a Server Action sanitizes each row **independently**, so one
  bad row never drops the rest of an otherwise-good import, and returns
  both a count and a reason per skipped row. Match this shape for any new
  importer rather than inventing a new pattern.
- Money/discount-like numeric fields in source spreadsheets are sometimes
  stored as negative numbers (a "reduction"); the app's convention is to
  normalize to a magnitude with `Math.abs()` at parse time (see
  `RentalObjectExcelImport.tsx` and `ApartmentExcelImport.tsx`), not to
  relax server-side validation to allow negatives.
- Excel date cells: use `excelDateCellToISO()` in `lib/table-columns.ts`,
  never hand-roll UTC-getter date formatting — see `docs/DECISIONS.md` for
  why (`getUTCFullYear`/`getUTCMonth`/`getUTCDate` on a SheetJS-parsed date
  silently shifts the date back a day in timezones ahead of UTC).
- Swedish is the UI language throughout (labels, dialogs, error messages);
  identifiers mix Swedish domain terms (`lagenhetsnummer`, `fastighet`,
  `hyresgast`, `andrahandsgast`) with English. Match existing terminology,
  don't translate it.
- Comments explain non-obvious *why*, not *what* — this matches the existing
  style throughout `lib/` and `app/**/actions.ts`; keep following it.

## Architectural constraints

- **Multi-tenant by `nationsID`.** A logged-in user's `nationsID` comes from
  a custom Auth0 ID-token claim (`NATIONS_ID_CLAIM` in `lib/nations.ts`).
  `proxy.ts` blocks any authenticated user without that claim from reaching
  app pages (redirects to `/nationsid-saknas`), except `/api/**`, `/auth/**`,
  `/nationsid-saknas`, and `/admin` (an admin's own account may have no
  nationsID, since they manage every nation). Never bypass this scoping in
  new code. Enforced twice: explicitly in every `lib/*.ts` query (app-layer
  convention above) and independently by Postgres Row Level Security
  policies keyed on the same claim, forwarded to Supabase via the Auth0 ID
  token (`lib/supabase-server.ts`) — see "Supabase / Postgres" below.
- **Role-based access** via a custom Auth0 claim (`ROLES_CLAIM` in
  `lib/roles.ts`). `admin` is a superuser role that satisfies every other
  role check (`hasRole`). `vaktmastare` is the one role that **restricts**
  rather than grants — a user whose only role is `vaktmastare` is redirected
  to `/todo` and confined there (`isRestrictedToTodo`, enforced in
  `proxy.ts`).
- Both custom claims depend on an Auth0 Action configured outside this
  repository. If a claim appears missing/wrong in practice, that Action is
  the first place to check — it cannot be inspected from the repo itself.
- **Supabase / Postgres.** No ORM — `lib/*.ts` files call
  `createSupabaseServerClient()` (a fresh per-request client, not
  module-cached — see the comment in `lib/supabase-server.ts` for why) and
  use the `@supabase/supabase-js` query builder directly against Supabase's
  Data API. Real schema now exists (tables, enums, `check` constraints,
  foreign keys — `supabase/migrations/*.sql`), unlike the old
  MongoDB-era schemaless documents; TypeScript types in each `lib/*.ts` file
  still aren't generated from the DB schema, so they can still drift from
  it — treat the migration files as the source of truth for actual column
  names/types, not the hand-written `Row` types in `lib/*.ts`. Row Level
  Security is enabled on every table (`supabase/migrations/20260812231542_rls.sql`)
  and enforces tenant isolation only — role/permission checks stay entirely
  in `app/*/actions.ts`, not duplicated into RLS policies (see
  `docs/DECISIONS.md` for the reasoning). Auth0 is registered as a
  Third-Party Auth issuer in the Supabase dashboard (not version-controlled,
  same caveat as the Auth0 Action above) — this is what lets `auth.jwt()` in
  RLS policies read the Auth0 token's claims at all.
- Binary files (floor plans, uppsägning documents, mail-template
  attachments) live in Supabase Storage, not the database — three private
  buckets (`floor-plans`, `uppsagningar-dokument`, `mail-template-attachments`),
  each with its own RLS-equivalent Storage policy keyed on a
  `{nations_id}/{row_id}/{filename}` path convention
  (`supabase/migrations/20260812233434_storage.sql`). The corresponding
  `lib/*.ts` file stores only a `storage_path` pointer column.
- Applying schema changes requires a direct Postgres connection
  (`SUPABASE_DB_URL`, session-pooler form — the transaction pooler is not
  suitable for `supabase db push`/migrations), not just the publishable API
  key: `npx supabase db push --db-url "$SUPABASE_DB_URL"`. The publishable
  key alone cannot run DDL or bypass RLS.
- `Needs verification`: exact hosting provider (no `vercel.json`/`.vercel/`
  found in the repo; `README.md` is unmodified `create-next-app` boilerplate
  that mentions Vercel).

## Validation requirements

Before considering any change complete:
1. `npx tsc --noEmit` — must be clean.
2. `npm run lint` — compare the result against the known pre-existing
   baseline (see "Setup..." above and `docs/HANDOFF.md`); don't leave *new*
   errors, but don't feel obligated to fix every pre-existing one unless
   asked.
3. For parsing/data-transformation logic: verify against a real sample file
   with a throwaway script, not just by reading the code.
4. For UI changes: run the dev server and check the actual rendered result,
   including loading/empty/error states — see the UX and UI completion
   sections below.
5. Update the shared docs (`docs/SESSION.md`, `docs/HANDOFF.md`, and
   `docs/DECISIONS.md`/`docs/TODO.md` if applicable) before finishing.

## Security and data-handling rules

- Never commit `.env*` files (already `.gitignore`d) or paste real secret
  values into code, commits, or any file under `docs/`. `.env.local.example`
  lists required variable **names** only, with placeholder values.
- Known environment variables actually read by the code (verified via
  `grep -r process.env`): `APP_BASE_URL`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`,
  `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (read implicitly by the Auth0 SDK),
  `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET` (Management API, via
  `requireEnv()` in `lib/app-users.ts`), `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (used by every `lib/*.ts` file via
  `createSupabaseServerClient()`), `SUPABASE_DB_URL` and
  `SUPABASE_SECRET_KEY` (admin-only: applying schema migrations and
  bypassing RLS for bulk operations — never used in normal app request
  paths, only in one-off scripts), `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
  `LAUNDRY_AUTH0_DOMAIN`, `LAUNDRY_AUTH0_MGMT_CLIENT_ID`,
  `LAUNDRY_AUTH0_MGMT_CLIENT_SECRET`, `LAUNDRY_AUTH0_CONNECTION` (a separate
  Auth0 tenant used only for laundry account provisioning,
  `lib/laundry-account.ts`). **`GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` are
  used in code but not currently listed in `.env.local.example`** — a real,
  verified gap; do not assume they're documented elsewhere.
- Every database query against a nation-scoped table must filter by
  `nations_id`. Treat any query without it as a bug — RLS backstops this at
  the database layer, but the explicit filter is still required (see
  "Architectural constraints" above).
- `SUPABASE_SECRET_KEY` bypasses Row Level Security entirely — treat it with
  the same care as a database superuser credential. It has no legitimate use
  inside a normal request path (Server Action, Route Handler, Server
  Component); it exists only for one-off admin scripts.
- This application routinely handles real personal data: Swedish
  personnummer, names, email addresses, phone numbers, and bank account
  numbers (tenants, apartment applicants, andrahandsgäster). Do not log it,
  do not paste sample rows containing real people's data into commit
  messages, code comments, or any file under `docs/`. When verifying an
  import against a real user-supplied spreadsheet, keep that verification
  in a throwaway script/output, not in committed files.
- Gmail OAuth refresh tokens (`gmail_tokens` table), `SUPABASE_SECRET_KEY`,
  and Auth0 M2M credentials are credentials — never log or persist them
  outside their existing storage. **A MongoDB connection string with an
  embedded password was accidentally printed into an agent's tool output
  during the migration session (2026-08-13) — the corresponding Atlas
  database user should be rotated or deleted if that hasn't happened yet.**
  When passing environment variables to a shell command, read one variable
  at a time (e.g. via `sed`/sourced into a scoped subshell) rather than
  `source`-ing the whole `.env.local` file — an unrelated variable
  containing shell-special characters (`&`, in that incident) can trigger
  bash job-control output that echoes other variables' values.

## Files or generated artifacts that must not be edited manually

- `next-env.d.ts` — regenerated by Next.js.
- `tsconfig.tsbuildinfo` — TypeScript incremental build cache.
- `.next/` — build output.
- `package-lock.json` — regenerate via `npm install`, don't hand-edit.
- `skills-lock.json` and `.agents/skills/**` — managed by external skills
  tooling, not hand-authored project content.
- `.idea/`, `.claude/settings.local.json` — local editor/tool configuration,
  not project configuration.

## Shared documentation

- `docs/ARCHITECTURE.md` — the currently implemented system.
- `docs/SESSION.md` — working memory for the current milestone.
- `docs/HANDOFF.md` — short-lived handoff for the next agent; replace it
  after every meaningful work session.
- `docs/DECISIONS.md` — durable, non-obvious decisions.
- `docs/TODO.md` — concrete, verified outstanding work.

## Standard Agent Workflow

Every coding agent must:

1. Read `AGENTS.md`.
2. Read `CLAUDE.md` if relevant.
3. Read `docs/SESSION.md`.
4. Read `docs/HANDOFF.md`.
5. Consult `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/TODO.md`.
6. Inspect Git status and verify documentation against the repository.
7. Summarize understanding before substantial implementation.
8. Reuse existing code and components before creating new abstractions.
9. Implement the smallest correct change.
10. Run relevant validation.
11. Update shared documentation.
12. Prepare a concise handoff.

The repository and test results are authoritative when documentation
conflicts with implementation.

Never record:

- secrets
- tokens
- credentials
- personal data
- hidden reasoning
- conversation transcripts
- speculative claims presented as facts

## Material UI

- Continue using MUI and the existing project theme (`lib/theme.ts`,
  wired in `app/layout.tsx`).
- Do not introduce another component library without explicit approval.
- Reuse shared components before creating new ones (e.g.
  `ColumnVisibilityMenu`, the existing `*ExcelImportDialog`/
  `*FormDialog` patterns).
- Prefer semantic MUI components over custom `div` structures.
- Prefer theme tokens, component variants, and theme overrides for repeated
  styling.
- Use `sx` for genuinely local styling, not to rebuild a design system on
  every page.
- Avoid arbitrary hardcoded colors and spacing when theme tokens exist.
- Avoid excessive nesting of `Box` when `Stack`, `Grid`, `Container`,
  `List`, `Table`, `FormControl`, or another semantic component is more
  appropriate.

### UX requirements

Before implementation, identify:

- the user's primary task
- the primary action
- secondary actions
- loading state
- empty state
- error state
- success feedback
- mobile behavior
- keyboard behavior

Avoid:

- unnecessary dialogs
- nested dialogs
- excessive cards
- unexplained icon-only actions
- hidden primary actions
- disabled controls without explanation
- forms that validate only after submission
- destructive actions without appropriate confirmation
- excessive snackbars for information that should remain visible on the page

### Forms

- Use clear labels, helper text, and actionable error messages.
- Preserve entered values after validation failures.
- Make required and optional fields clear.
- Show submission progress.
- Prevent duplicate submissions.
- Focus or announce important validation errors where appropriate.

### Responsive design

- Design mobile behavior intentionally.
- Do not merely shrink the desktop layout.
- Keep primary actions reachable.
- Use deliberate mobile alternatives for wide tables.
- Verify representative mobile, tablet, and desktop widths.

### Accessibility

- Preserve semantic HTML and MUI accessibility behavior.
- Ensure complete keyboard operation.
- Ensure visible focus.
- Associate labels, descriptions, and errors correctly.
- Use ARIA only when native semantics are insufficient.
- Maintain sufficient contrast.
- Respect reduced-motion preferences.

## Skills policy

When doing UI work:

- Use `frontend-design` during planning for hierarchy, composition, spacing,
  typography, interaction clarity, and visual polish.
- Use `vercel-react-best-practices` during React implementation.
- Use `web-design-guidelines` before considering UI work complete.
- Use Ponytail throughout implementation to keep the solution simple and
  avoid overengineering.

These skills should be applied automatically unless explicitly instructed
otherwise. (`frontend-design`, `vercel-react-best-practices`, and
`web-design-guidelines` are vendored in this repository under
`.agents/skills/`, tracked by `skills-lock.json`.)

When using `frontend-design`:

- keep Material UI
- keep the existing theme and design language
- do not introduce Tailwind, shadcn, styled-components, or another UI system
- do not replace existing design tokens
- avoid unnecessary custom fonts, decorative effects, and elaborate
  animations
- prioritize usability, consistency, accessibility, and task completion over
  novelty

When doing Supabase or Postgres work (the app now runs entirely on
Supabase/Postgres — the MongoDB-to-Supabase migration referenced by the
`mongodb-to-supabase-ref` branch is complete, see `docs/DECISIONS.md`):

- Use `supabase` for any task touching Supabase products (Database, Auth,
  Edge Functions, Realtime, Storage), the `supabase-js`/`@supabase/ssr`
  client libraries, the Supabase CLI or MCP server, or debugging
  Supabase-specific errors (RLS surprises, schema cache issues, auth/session
  handling).
- Use `supabase-postgres-best-practices` before writing or changing anything
  that lives in a Postgres database: table/column design, migrations,
  declarative schema files, RLS policies, indexes, triggers, functions, or
  diagnosing slow queries/locking/bloat. Load it even for a one-column
  change or a single query — schema and RLS mistakes are costly to unwind
  given this app's per-`nationsID` multi-tenant scoping (see "Architectural
  constraints" above), which any Postgres RLS design must reproduce
  correctly.

These skills are applied automatically, the same as the other three, unless
explicitly instructed otherwise. `supabase` and `supabase-postgres-best-practices`
are vendored under `.agents/skills/`, tracked by `skills-lock.json`, sourced
from `supabase/agent-skills`.

## UI completion criteria

For meaningful UI changes:

1. Inspect the rendered interface, not only the JSX.
2. Review desktop and mobile layouts.
3. Verify loading, empty, error, and success states.
4. Test keyboard navigation.
5. Run available accessibility checks.
6. Use `web-design-guidelines` to audit the result.
7. Fix meaningful findings before declaring completion.
