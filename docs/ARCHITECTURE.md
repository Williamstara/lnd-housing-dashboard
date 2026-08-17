# Architecture

Describes the system as currently implemented, with file paths as evidence.
Items that couldn't be confirmed from the repository alone are marked
`Needs verification`. See `AGENTS.md` for conventions and constraints;
this file describes *what exists*, not *how to write more of it*.

## Responsive application shell

- `app/layout.tsx` renders a flex application shell with a skip link and a
  main-content landmark. `components/NavBar.tsx` is a persistent 272 px MUI
  drawer on desktop, collapsible to a 72 px icon rail, and a compact app bar
  plus temporary drawer on phones.
- Operational routes use full-width MUI containers. Row-oriented feature
  components render tables on larger screens and labeled cards on phones;
  both presentations consume the same filtered, sorted, paginated slice and
  default to 10 items per page.
- Excel preview rows use `components/ResponsivePreview.tsx`, which provides
  the same table/card split and pagination. Parent table components
  dynamically load the heavy SheetJS import dialogs.
- Shared dialog geometry, form density, focus visibility, reduced-motion
  behavior, and responsive pagination live in `lib/theme.ts`.
- Secondary occupants in `lib/andrahandsgaster.ts` have a `typ` of
  `andrahandsgast` or `inneboende`; missing legacy values resolve to
  `andrahandsgast`. Statistics define total tenants as primary tenants plus
  occupants whose type is `inneboende`.

## Entry points

- `app/layout.tsx` — root layout. Resolves the active nation
  (`getActiveNationsId`, `lib/active-nation.ts`, reading Clerk's
  `nations_id` session claim) and its settings to know which nav
  entries/feature flags to show, wraps the app in Clerk's `ClerkProvider`,
  MUI's `AppRouterCacheProvider` + `ThemeProvider` (`lib/theme.ts`) +
  `CssBaseline`, then renders `NavBar` (`components/NavBar.tsx`, passed
  `enabledFeatures`) and `{children}`.
- `proxy.ts` (repository root) — Next.js 16's replacement for
  `middleware.ts`. Runs on every request matched by its `config.matcher`
  (everything except `_next/static`, `_next/image`, `favicon2.ico`, and
  common image extensions). Wrapped in `clerkMiddleware()` (required for
  Clerk's session syncing) but deliberately does **not** call
  `auth.protect()` — Clerk deprecated middleware-based route protection in
  favor of resource-based checks (see `docs/DECISIONS.md`'s "Auth0 → Clerk
  migration" entry); each protected page calls `auth.protect()` itself.
  What's left in `proxy.ts` is UX/business-rule routing only, both
  independently re-enforced at the resource level too (defense in depth,
  not the security boundary):
  1. Redirects a signed-in user with no `nations_id` claim to
     `/nationsid-saknas` — skipped for `/api/**`, `/admin`, `/sign-in`,
     `/sign-up`, `/nationsid-saknas` (see code comment for why each is
     excluded), and for anyone not signed in at all (their own
     `auth.protect()` call in the page they land on handles that).
  2. Redirects a signed-in user whose *only* role is `vaktmastare` to
     `/todo` (see `lib/roles.ts`'s `isRestrictedToTodo`).
- `app/page.tsx` — the home page (`/`). Calls `await auth.protect()` as its
  first line, then shows a welcome header and `NavGrid`
  (`app/_components/nav-grid.tsx`, built from `lib/nav-links.tsx`).
- Every other feature route under `app/*/page.tsx` also calls
  `auth.protect()` as its first line and follows the same shape — see
  "Major components" below. Two Client-Component pages that fetch their
  data via API routes instead of server-side data fetching (`/mallar`,
  `/planritningar`) can't call `auth.protect()` directly (server-only);
  they're wrapped in `components/RequireSignedIn.tsx` instead (Clerk's
  documented client-side equivalent — redirects a signed-out visitor,
  their underlying API routes independently enforce the real auth check
  either way).

## Major components (routes)

Each of these is `app/<name>/page.tsx` (+ `actions.ts` for mutations),
rendering one or more `components/*Table.tsx` / `components/*Dialog.tsx`
client components. Swedish label shown in the app's nav is in parentheses.

| Route | Purpose |
|---|---|
| `app/lediga-lagenheter` | Available apartments ("Lediga lägenheter") — the main leasing pipeline: list → contact → send to contract. `components/ApartmentsTable.tsx`, `components/ApartmentFormDialog.tsx`, `components/ApartmentInterestDialog.tsx`, `components/ApartmentExcelImport.tsx`, `components/LaundryAccountDialog.tsx`. |
| `app/hyresgastlista` | Tenants and second-hand tenants ("Hyresgästlista"). `components/TenantsTable.tsx` + `components/AndrahandsgasterTable.tsx`, each with a form dialog and an Excel import dialog. |
| `app/databas` | Full rental-object database ("Databas") — specs/pricing per lägenhetsnummer, independent of current occupancy. `components/RentalObjectsTable.tsx`, `components/RentalObjectExcelImport.tsx` (supports a single-sheet mode and an admin-defined multi-tab mode). |
| `app/besiktningar` / `app/arkiv` (besiktningar tab) | Inspections, including a segmented status bar (Obehandlade/Klara för betalning/Betalda, plain MUI flexbox, not a chart component) and a date-driven bulk select-and-mark flow. `components/BesiktningarTable.tsx`, `components/ArkivBesiktningarTable.tsx`, `components/BesiktningarExcelImportDialog.tsx`. |
| `app/redo-for-kontrakt` | Apartments in the "sent to contract" stage. `components/ContractsReadyTable.tsx`. |
| `app/arkiv` | Signed/archived contracts. `components/ArchiveTable.tsx`. |
| `app/uppsagning` | Tenant notice/termination flow. `components/ConfirmUppsagningDialog.tsx`, `components/UppsagningTable.tsx`. |
| `app/fastigheter` | Buildings ("Fastigheter") — the registry every other feature's `fastighet` field is validated against. `components/FastigheterTable.tsx`. |
| `app/statistik` | Missed-rent and other statistics: housing/tenant totals, occupancy form, homes per building, homes per `typ`, vacant apartments per leasing-pipeline status, occupancy, missed rent, condition, revenue. `components/StatistikOverview.tsx`, `components/charts/*` (`BarChart`, `DonutChart`, `StatTile`). |
| `app/mallar` | Email templates. `components/email/TemplateEditorDialog.tsx`. |
| `app/epost` | Compose/send email to a recipient group. `components/email/SendMailClient.tsx`, `RecipientGroupPicker.tsx`. |
| `app/planritningar` | Floor plan PDF upload/storage per lägenhetsnummer. `components/email/FloorPlanCard.tsx`, `UploadConfirmDialog.tsx`. |
| `app/profil` | User profile — Gmail connection status. `components/email/ProfileGmailSection.tsx`. |
| `app/todo` | Shared todo list. `components/TodoList.tsx`. |
| `app/admin` | Cross-nation admin, four tabs per nation: Kolumner (table column config, now 7 tables), Import-mappningar (Excel import column mappings, fastighet name aliases, rental-object multi-tab groups), Behörigheter (per-nation role→permission mapping), Funktioner (per-nation feature flags). Plus user role/nationsID assignment. Admin-role only. `components/AdminPage.tsx`, `components/AdminShell.tsx`, `components/AdminUsersPanel.tsx`. |
| `app/nationsid-saknas` | Explanation page for a logged-in user with no `nationsID` claim. |

## Module responsibilities (`lib/`)

One file per Postgres table, `server-only`, typed CRUD built on
`createSupabaseServerClient()` (`lib/supabase-server.ts`):
`lib/apartments.ts` (`apartments`), `lib/tenants.ts` (`tenants`),
`lib/andrahandsgaster.ts` (`andrahandsgaster`), `lib/rentalobjects.ts`
(`rentalobjects`), `lib/fastigheter.ts` (`fastigheter`),
`lib/besiktningar.ts` (`besiktningar`), `lib/todos.ts` (`todos` +
`todo_subtasks`, normalized out of Mongo's embedded array — see
`docs/DECISIONS.md`), `lib/uppsagningar.ts` (`uppsagningar`),
`lib/missed-rent.ts` (`missed_rent`), `lib/mail-templates.ts`
(`mail_templates`), `lib/floor-plans.ts` (`floor_plans`),
`lib/gmail-tokens.ts` (`gmail_tokens`), `lib/recipient-groups.ts` (no table
of its own — pure derived queries over `tenants`/`apartments`),
`lib/statistik.ts` (pure aggregation over already-fetched arrays, no
queries of its own), `lib/nation-settings.ts` (`nations` +
`nation_role_permissions` — see below),
`lib/app-users.ts` (talks to Clerk's Backend SDK — `@clerk/nextjs/server`'s
`clerkClient()` — not the database; a nation's Clerk Organization is looked
up by matching its `public_metadata.nationsId`, not stored as a foreign
key anywhere in Postgres).

Also `server-only`, not tied to one table:
- `lib/permissions.ts` — `requirePermission(permissionKey, errorMessage)`,
  the single shared guard every role-gated Server Action uses (replaced
  ~10 independently hand-written `requireXRole()` functions —
  `docs/DECISIONS.md`/`docs/SAAS-READINESS-ROADMAP.md` Tier 2.1). Resolves
  the caller's active nationsId, fetches that nation's saved
  `nation_role_permissions` rows (React `cache()`-deduped per request), and
  checks against `lib/roles.ts`'s `hasPermission`.
- `lib/active-nation.ts` — server-only reads of Clerk's session claims
  (`@clerk/nextjs/server`'s `auth()`/`currentUser()`, each wrapped in
  React's `cache()` to dedupe the many calls one request's render tree
  makes): `getActiveNationsId`/`requireActiveNationsId`/
  `requireActiveNationsIdOrRedirect` (the `nations_id` claim),
  `getSessionRoles` (the `roles` claim, `lib/roles.ts`'s
  `normalizeRoles`-shaped), `getCurrentUserId`, `getCurrentUserDisplayName`.
  No cookie, no multi-nation switching logic — Clerk's own active-
  organization mechanism (native to Organizations) is what used to be
  hand-rolled here before the Auth0→Clerk migration; see
  `docs/DECISIONS.md`.

Not server-only (imported by client components too):
- `lib/table-columns.ts` — pure types + defaults + resolver helpers for
  every admin-configurable, per-nation setting (`NationSettings`,
  `ImportMapping`, `FastighetAlias`, `RentalObjectTabGroup`, and the pure
  functions `resolveColumns`, `resolveImportMapping`,
  `resolveFastighetAliases`, `resolveFastighetName`,
  `applyFastighetAlias`, `resolveFastighetFromPrefix`,
  `excelDateCellToISO`, `cellStr`, `columnIndexToLetter`/
  `columnLetterToIndex`, `describeMapping`, `mappingToLookup`,
  `isFeatureEnabled`, `getCurrency`/`getLocale`/`formatCurrency`/
  `formatCurrencyWithUnit`). `NationSettings` now also carries
  `enabledFeatures`/`currency`/`locale`, and `TableKey` covers 7 tables
  (`apartments`, `rentalobjects`, `tenants`, `andrahandsgaster`, `arkiv`,
  `uppsagning`, `todo`). `lib/nation-settings.ts` wraps this with the
  actual Supabase-touching CRUD (`getNationSettings`, `saveTableSettings`,
  `saveImportMapping`, `saveFastighetAliases`,
  `saveRentalobjectTabGroups`, `setRentalobjectsMultiTab`,
  `saveEnabledFeatures`, `saveCurrencyLocale`, `getNationRolePermissions`,
  `saveNationRolePermissions`) and re-exports the pure pieces so callers
  only need one import path server-side.
- `lib/roles.ts` — pure functions over a plain `string[]` roles array
  (`hasRole`/`hasAnyRole`/`isRestrictedToTodo`/`requireAdminOrRedirect`/
  `normalizeRoles`), deliberately provider-agnostic (no Clerk/Auth0 import)
  so it stays client-importable (`NavBar.tsx` et al. call it with an array
  read from Clerk's client-side `useAuth().sessionClaims.roles`; server
  call sites use `lib/active-nation.ts`'s `getSessionRoles()`). Also
  defines the permission model: `PERMISSIONS` (the fixed set of role-gated
  actions), `DEFAULT_PERMISSION_ROLES` (the hardcoded fallback — `LND`'s
  current behavior, used when a nation has no saved
  `nation_role_permissions` rows), and pure
  `hasPermission(roles, permissionKey, savedRoles)`. Admin itself is never
  routed through this table — `hasRole`'s superuser bypass stays hardcoded,
  deliberately not nation-configurable.
- `lib/nav-links.tsx` — the nav structure (`app/_components/nav-grid.tsx`,
  `components/NavBar.tsx`); each `NavLink` can carry a `featureKey` that
  hides it when a nation has that feature disabled.
- `lib/mail-utils.ts` — pure string/placeholder helpers for email templates.
- `lib/use-column-visibility.ts` — a client-only `localStorage`-backed hook
  for per-user column show/hide state (independent of the admin-configured
  column *set*, which is per-nation and server-stored).
- `lib/export-xlsx.ts` — client-side "export table to .xlsx" helper.

## Data flow

1. A route's `page.tsx` (Server Component) calls `await auth.protect()`
   (`@clerk/nextjs/server`) as its first line, then
   `requireActiveNationsIdOrRedirect` (`lib/active-nation.ts`), then
   fetches everything the page needs in parallel via `Promise.all`,
   resolving admin-configured settings against `DEFAULT_*` fallbacks.
2. Data is passed as props into a `"use client"` `*Table.tsx` component,
   which owns local UI state (search, sort, pagination, which dialog is
   open) and renders `*FormDialog.tsx` / `*ExcelImportDialog.tsx` children.
3. A user action calls a Server Action from `app/<route>/actions.ts`. The
   action re-derives `nationsId` (and checks role, if restricted) from the
   session — **never trusts a nationsId passed from the client** — sanitizes
   input, calls the matching `lib/*.ts` function, and calls
   `revalidatePath(...)` for every page the change could affect (a change in
   one table often has to invalidate more than one route — e.g. saving
   a `fastigheter` prefix revalidates both `/fastigheter` and
   `/lediga-lagenheter`).
4. Next.js re-renders the affected Server Component(s) on next navigation/
   revalidation, flowing fresh data back down as props.

Excel import specifically (see `AGENTS.md` "Coding conventions" for the
shared shape): the workbook is read and parsed **entirely in the browser**
(`xlsx` package, `FileReader`) — no file is ever uploaded to the server.
Only the parsed, already-validated JSON rows are sent to a Server Action.

## State and persistence

- **Supabase (Postgres)**, one project, one `public` schema, one table per
  collection listed above — see `supabase/migrations/*.sql` for the
  authoritative schema (tables, enums, `check` constraints, foreign keys,
  indexes). No ORM; each `lib/*.ts` file defines its own `Row` TS type
  (snake_case, matching actual Postgres columns) and a `mapRow` function
  converting it to the camelCase type the rest of the app uses.
- **Every nation-scoped table has a `nations_id text references
  nations(nations_id)` column**, filtered explicitly in every query
  (`.eq("nations_id", nationsId)`) *and* independently enforced by Postgres
  Row Level Security (`supabase/migrations/20260812231542_rls.sql`, claim
  path updated by `supabase/migrations/20260814020000_clerk_claims.sql`) —
  a fail-closed backstop: a query that somehow omitted the filter would
  return zero rows, not another tenant's data. `gmail_tokens` is the one
  exception, scoped by `user_id` (Clerk's user ID — was Auth0's `sub`
  before the migration; existing rows keyed on the old format would need
  re-keying if any had existed, see `docs/DECISIONS.md`) instead — it's
  per-user, not per-nation.
- RLS policies read `nations_id`/`roles` claims out of `auth.jwt()`,
  populated by forwarding Clerk's session token to Supabase's Data API via
  a Third-Party Auth integration (`lib/supabase-server.ts`) — Clerk is the
  identity system of record, Supabase never runs its own native auth flow.
  RLS enforces tenant isolation only; role/permission checks stay entirely
  in `app/*/actions.ts` (see `docs/DECISIONS.md` for why they weren't
  duplicated into RLS policies).
- `todos.subtasks` (an embedded array in the old Mongo model) is normalized
  into a `todo_subtasks` child table with a real foreign key. The parent
  `todos.klar` completion flag — previously recomputed by an explicit
  `syncTodoCompletion()` call after every subtask mutation — is now
  recomputed by a Postgres trigger (`sync_todo_completion`,
  `supabase/migrations/20260812231459_schema.sql`) firing on every
  `todo_subtasks` insert/`klar`-update/delete. `lib/todos.ts` no longer
  calls anything explicitly to keep it in sync.
- Floor plans, uppsägning documents, and mail-template attachments are
  stored in **Supabase Storage** (three private buckets — `floor-plans`,
  `uppsagningar-dokument`, `mail-template-attachments` — see
  `supabase/migrations/20260812233434_storage.sql`), not inline in the
  database. Each bucket's objects live at a `{nations_id}/{row_id}/{filename}`
  path, with a Storage RLS policy checking the first path segment against
  the caller's `nationsID` claim — the same tenant-scoping shape as every
  table policy. The corresponding `lib/*.ts` file stores only a
  `storage_path`/filename/content-type pointer; API routes that stream a
  file (`app/api/floor-plans/[id]/file`, `app/api/uppsagningar/[id]/file`)
  needed no changes during the migration since `getFloorPlanFile`/
  `getUppsagningFile` kept the exact same `{data: Buffer, contentType,
  ...}` return shape.
- `lib/use-column-visibility.ts` is the one piece of client-side persistent
  state (`localStorage`, keyed per table), independent of server state.
- `nation_role_permissions` (added 2026-08-13) is a proper many-rows-per-nation
  table — `(nations_id, role_name, permission_key)`, unique-constrained —
  not a JSONB blob on `nations` like every other admin-configurable setting.
  Same tenant-isolation RLS shape as every other table. Empty for a nation =
  falls back to `lib/roles.ts`'s `DEFAULT_PERMISSION_ROLES`.
- `nations` gained three more nullable columns (also 2026-08-13):
  `enabled_features text[]`, `currency text`, `locale text` — all
  null/absent means "everything enabled" / `"kr"` / `"sv-SE"` respectively,
  `LND`'s exact behavior today, same "saved ?? default" convention as every
  other `NationSettings` field.

## APIs and external services

- **Clerk** — authentication and identity (`@clerk/nextjs`, `proxy.ts`,
  `lib/active-nation.ts`) and, separately, the **Clerk Backend SDK**
  (`clerkClient()`) for the admin page's user/role/nationsID assignment UI
  (`lib/app-users.ts`: list Organization members, assign a user to a
  nation's Organization, assign roles via `publicMetadata`, delete user).
  Nations map 1:1 to Clerk Organizations (matched by
  `public_metadata.nationsId`); see `docs/DECISIONS.md`.
- **A separate Auth0 tenant** for laundry-room account provisioning
  (`lib/laundry-account.ts`, `LAUNDRY_AUTH0_*` env vars) — entirely
  unrelated to app login (which is Clerk, above); untouched by the
  Auth0→Clerk migration. Creates/replaces a laundry-system user
  account per tenant, keyed by lägenhetsnummer, with a building code
  (`GH`/`NH`/`FH`/`A`–`D`) resolved from the apartment's `fastighet` string.
  `Needs verification`: as of the last check in this repo's history, the
  building-code lookup tables in this file (`FASTIGHET_BUILDING`,
  `FASTIGHET_LAUNDRY_BUILDING`) and the lägenhetsnummer-prefix table in
  `lib/rentalobjects.ts` (`FASTIGHET_PREFIXES`) still use an **old, obsolete
  long-form fastighet naming scheme** (e.g. `"Arkivet (223 59, Lund)"`) that
  does not match the short names actually stored in the `fastigheter`
  collection today (e.g. `"Arkivet"`). This was found and explicitly
  **not** fixed in this session (out of the agreed scope) — see
  `docs/TODO.md`.
- **Google (Gmail API)** via `googleapis` — OAuth2 connect flow
  (`app/api/auth/gmail/*`), refresh tokens stored per-user in
  `gmail_tokens`; outgoing mail is sent through a `nodemailer` transport
  configured with those OAuth2 credentials (`app/api/send-mail/route.ts`).
- **Supabase** — Postgres database, Row Level Security, and Storage (see
  "State and persistence" above), plus Third-Party Auth (accepts Clerk's
  session token as a bearer token, verified against Clerk's JWKS —
  configured in the Supabase dashboard, not version-controlled in this
  repo). Applying schema migrations or bypassing RLS for admin/bulk scripts
  requires a direct Postgres connection (`SUPABASE_DB_URL`) or the secret
  key (`SUPABASE_SECRET_KEY`) — normal app request paths use only the
  publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) plus the
  forwarded Clerk token. `Needs verification`: `service_role` (the secret
  key's Postgres role) appears to be missing `SELECT` grants on at least
  `gmail_tokens` and `todos` — found via a permission-denied error while
  checking migration data, not yet fixed; see `docs/TODO.md`.

## Authentication and authorization

- Login/session: Clerk (`@clerk/nextjs`, `proxy.ts`). `proxy.ts` wraps
  everything in `clerkMiddleware()` for session syncing, but does **not**
  gate access itself — Clerk deprecated middleware-based route protection
  (see `docs/DECISIONS.md`); every protected `page.tsx` calls
  `await auth.protect()` itself as its first line instead (see "Entry
  points" above).
- **Multi-tenancy claim**: `nations_id`, a plain top-level session-token
  claim (Clerk instance config: `session.claims.nations_id =
  "{{org.public_metadata.nationsId}}"`, not version-controlled in this
  repo — configured via `clerk config patch`, same caveat as the old Auth0
  Action). Each nation is a Clerk Organization; `nationsId` lives in that
  Organization's `public_metadata`, set when the Organization is created
  (`lib/app-users.ts`'s `findOrCreateNationOrg`, called from
  `lib/nation-settings.ts`'s `createNation`). App code reads it via
  `lib/active-nation.ts`'s `getActiveNationsId`/`requireActiveNationsId`/
  `requireActiveNationsIdOrRedirect` server-side, or the client's
  `useAuth().sessionClaims.nations_id` directly (`NavBar.tsx`). No cookie,
  no custom "active nation" logic — a user's active Organization (and
  therefore active nation) is Clerk's own native session state.
- **Roles claim**: `roles`, also a plain top-level session-token claim
  (`session.claims.roles = "{{user.public_metadata.roles}}"`) — a per-user
  grant, not a per-Organization-membership one (deliberately not using
  Clerk's Organization custom-roles feature, which needs a paid add-on
  past its two free defaults — see `docs/DECISIONS.md`). Known roles:
  `ekonomi`, `admin`, `husvd`, `husforman`, `vaktmastare`
  (`lib/roles.ts`'s `ROLES`). `admin` satisfies every `hasRole` check
  (superuser). `vaktmastare` is access-*restricting* (`isRestrictedToTodo`)
  — enforced only in `proxy.ts` and reflected in nav visibility, not
  re-checked on every page.
- **Permission model** (added 2026-08-13): which role can do what, beyond
  the coarse role check above, is now per-nation-configurable rather than
  hardcoded per action. `lib/roles.ts`'s `PERMISSIONS` enumerates the fixed
  set of role-gated actions (e.g. `besiktningar.archive`); each nation can
  save its own role→permission rows in the `nation_role_permissions` table
  (editable via `/admin`'s "Behörigheter" tab), falling back to
  `DEFAULT_PERMISSION_ROLES` (LND's original hardcoded mapping) when unset.
  `admin` itself is never routed through this table — that bypass stays
  hardcoded in `hasRole`, deliberately not nation-configurable (a nation
  shouldn't be able to grant itself cross-tenant superuser access).
- Page-level guards: `await auth.protect()` (must be logged in, first line
  of every protected `page.tsx`) + `requireActiveNationsIdOrRedirect` (must
  have a nationsID) +, for admin-only pages, `requireAdminOrRedirect`. Two
  Client-Component pages that can't call `auth.protect()` server-side use
  `components/RequireSignedIn.tsx` instead (see "Entry points" above).
- Action-level guards: `lib/permissions.ts`'s `requirePermission(permissionKey,
  errorMessage)` is the single shared guard for anything gated by the
  permission model above — it replaced ~10 independently hand-written
  `requireXRole()` functions that used to live one per `actions.ts` file.
  A handful of `actions.ts` files still keep their own local `requireUser()`
  (any authenticated nation member, no permission check) for actions that
  were never role-restricted. Both throw (not redirect) on failure — the
  client catches the thrown `Error.message` and displays it in an `Alert`.
- **Opt-out feature flags** (added 2026-08-13, unrelated to roles/permissions
  — gates UI visibility, not authorization): `lib/table-columns.ts`'s
  `FEATURES`/`isFeatureEnabled`, backed by `nations.enabled_features`,
  editable via `/admin`'s "Funktioner" tab. Hides nav entries and buttons
  for integrations a nation doesn't use (Gmail sending, laundry accounts,
  key-handover tracking) — the underlying data/columns stay in place
  either way, so this is purely a display concern, never enforced
  server-side (nothing sensitive is gated behind it).

## Configuration and environment variables (names only)

See `.env.local.example` and the "Security and data-handling rules" section
of `AGENTS.md` for the full, verified list. Grouped by service: Clerk
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`,
`NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
— written by `clerk init`), Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — used in normal app request paths;
`SUPABASE_DB_URL`, `SUPABASE_SECRET_KEY` — admin/migration only, never used
inside a Server Action or Route Handler), Gmail (`GMAIL_CLIENT_ID`,
`GMAIL_CLIENT_SECRET` — **not** currently in `.env.local.example`, a
verified documentation gap), laundry Auth0 tenant (`LAUNDRY_AUTH0_DOMAIN`,
`LAUNDRY_AUTH0_MGMT_CLIENT_ID`, `LAUNDRY_AUTH0_MGMT_CLIENT_SECRET`,
`LAUNDRY_AUTH0_CONNECTION` — unrelated to app login, see "APIs and external
services" above). `APP_BASE_URL` is still read, just no longer for Auth0 —
`app/api/auth/gmail/callback/route.ts`/`connect/route.ts` use it to build
the Gmail OAuth redirect URI. The six `AUTH0_*`/`AUTH0_M2M_*` app-login
variables from the pre-Clerk setup are no longer read by any code as of
the Auth0→Clerk migration but may still be present in `.env.local` —
harmless if left, safe to remove.

## Error handling

- Server Actions throw a plain `Error` with a Swedish, user-facing message;
  the calling client component wraps the action in `try/catch` and renders
  the message in an MUI `<Alert severity="error">`.
- Bulk operations (Excel imports) sanitize **per row**, catching and
  recording each row's error individually so one bad row doesn't fail the
  whole batch — see `importApartmentsFromExcelAction` in
  `app/lediga-lagenheter/actions.ts` and the equivalent `bulkUpsert*`
  functions for the pattern.
- Route Handlers (`app/api/**`) return `Response.json({ error }, { status })`
  rather than throwing.
- Every `lib/*.ts` Supabase call checks `error` and re-throws it directly
  (no message translation) — the calling Server Action's own `try/catch`
  is what turns it into a Swedish user-facing message.

## Testing structure

**None exists.** No test framework is installed; no `test` script in
`package.json`. Do not assume otherwise. See "Validation requirements" in
`AGENTS.md` for what actually substitutes for automated tests in this repo.

## Deployment and runtime structure

`Needs verification` — no `vercel.json`/`.vercel/` found in the repository,
so the exact deployment target isn't confirmed from the repo alone. Strong
circumstantial evidence points to Vercel: `README.md` is the stock
`create-next-app` boilerplate (which recommends Vercel). The database
connection concerns a serverless deployment previously had to manage by
hand (MongoDB connection pooling, capped in `lib/mongodb.ts`, now deleted)
don't apply to Supabase's Data API — each request is a stateless HTTPS call
through PostgREST/`@supabase/supabase-js`, not a pooled driver connection
held open per server instance.

## Known technical limitations

- No automated tests.
- Real schema constraints now exist at the database layer (types, enums,
  `check` constraints, foreign keys — `supabase/migrations/*.sql`), but the
  hand-written `Row`/mapping types in each `lib/*.ts` file are not generated
  from that schema and can still drift from it silently if a migration
  changes a column without the corresponding `lib/*.ts` file being updated
  to match — there's no build-time check tying the two together.
- Excel-importer dialogs each define some of their own local cell-parsing
  helpers rather than sharing one utility module. `cellStr` (byte-identical
  across `ExcelImportDialog.tsx`, `AndrahandsgastExcelImportDialog.tsx`,
  `BesiktningarExcelImportDialog.tsx`, `ApartmentExcelImport.tsx`) was
  centralized into `lib/table-columns.ts` 2026-08-13, alongside the
  pre-existing `excelDateCellToISO` and the fastighet-name resolution
  helpers. `cellNum`/`cellDate` (`ApartmentExcelImport.tsx`) and
  besiktningar's `parseNumber`/`formatDateCell`
  (`BesiktningarExcelImportDialog.tsx`) were investigated and found to have
  different signatures and, for besiktningar's date handling, genuine
  importer-specific logic (merged-cell inheritance down a column, a
  YYMMDD-as-plain-number fallback) — left local rather than force a
  premature shared abstraction over behavior that actually differs per
  importer. `RentalObjectExcelImport.tsx` was never part of this pattern
  (no local `cellStr`-equivalent).
- `lib/laundry-account.ts` and `lib/rentalobjects.ts` contain hardcoded
  fastighet-name lookup tables using an obsolete long-form naming scheme —
  see "APIs and external services" above and `docs/TODO.md`. Verified
  broken for any fastighet other than the one whose lookup has a
  string-`.includes()` fallback.
- Clerk's session-token claim customization (`session.claims.nations_id`/
  `.roles`) is not version-controlled — it can only be inspected/changed
  via `clerk config pull`/`clerk config patch` or the Clerk dashboard, not
  from a file in this repo (same class of gap the old Auth0 Action had).
  Multi-nation support (a user belonging to more than one Organization) is
  no longer implemented in-app at all — the Auth0-era hand-rolled
  cookie-based active-nation switcher was deliberately removed rather than
  ported during the Auth0→Clerk migration, since it had never been
  exercised by a real session; rebuild via Clerk's native
  `<OrganizationSwitcher />` if a real multi-nation operator account is
  ever needed (see `docs/DECISIONS.md`).
- Nation-aware currency/locale formatting (`lib/table-columns.ts`'s
  `getCurrency`/`getLocale`/`formatCurrency`) is only threaded through
  `StatistikOverview.tsx`, `ApartmentFormDialog.tsx`,
  `RentalObjectFormDialog.tsx`, their host tables, and `MissedRentTable.tsx`
  — a deliberate scope decision (every nation currently in discussion is
  Swedish/SEK), not an oversight. ~6 more files still call
  `new Intl.NumberFormat("sv-SE", ...)` directly, and 26
  `toLocaleLowerCase("sv")`/`localeCompare(..., "sv", ...)` search/sort
  sites across nearly every `*Table.tsx` are still hardcoded to Swedish
  collation. See `docs/TODO.md`'s "Later" section for the exact remaining
  list.
- `TenantFormDialog.tsx`/`AndrahandsgastFormDialog.tsx` don't respect
  admin-configured column visibility the way `ApartmentFormDialog.tsx`/
  `RentalObjectFormDialog.tsx` do — blocked on
  `app/hyresgastlista/actions.ts`'s server-side validation, which
  blanket-requires every field non-blank. See `docs/DECISIONS.md`.
